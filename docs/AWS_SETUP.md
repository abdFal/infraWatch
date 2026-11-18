# AWS integration setup

> **Status:** the AWS provider (`src/lib/providers/aws-provider.ts`) is **Phase 2** and not built yet.
> You can already create the IAM policy and the AWS CLI profile below. Switching to `MONITORING_PROVIDER=AWS` currently returns a clear "AWS mode is not available yet" error. It never falls back to mock data.

## 1. What the dashboard calls

The app is **read-only**. It calls exactly four AWS APIs:

| API | Used for |
| --- | --- |
| `ec2:DescribeInstances` | Instance list and details (ID, name tag, type, AZ, state, IPs, launch time) |
| `ec2:DescribeInstanceStatus` | System and instance status checks (the "Degraded" status) |
| `cloudwatch:GetMetricData` | Metric time series (CPU, network, disk ops, memory, disk usage) |
| `cloudwatch:ListMetrics` | Finding CloudWatch Agent disk metrics, whose dimensions (`path`, `device`, `fstype`) vary per instance |

Users can't trigger any other AWS call. The browser only talks to fixed API routes in this app, inputs are validated with Zod, and the region must come from a fixed allow-list.

## 2. Least-privilege IAM policy

The policy is in [`iam-policy.json`](iam-policy.json):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EC2ReadOnlyInstances",
      "Effect": "Allow",
      "Action": ["ec2:DescribeInstances", "ec2:DescribeInstanceStatus"],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchReadOnlyMetrics",
      "Effect": "Allow",
      "Action": ["cloudwatch:GetMetricData", "cloudwatch:ListMetrics"],
      "Resource": "*"
    }
  ]
}
```

Why `"Resource": "*"`: these `Describe*`, `GetMetricData` and `ListMetrics` actions don't support resource-level permissions, so AWS requires `*`. They can only read.

Optional extra restriction. To limit the dashboard to specific regions, add this `Condition` to both statements:

```json
"Condition": { "StringEquals": { "aws:RequestedRegion": ["us-east-1", "ap-southeast-3"] } }
```

### Create the policy (AWS Console)

1. Open **IAM → Policies → Create policy → JSON**.
2. Paste the contents of `docs/iam-policy.json`.
3. Name it `InfraWatchReadOnly` and create it.

Or with the AWS CLI, run this in the project folder:

```bash
aws iam create-policy --policy-name InfraWatchReadOnly --policy-document file://docs/iam-policy.json
```

## 3. Local development credentials (macOS)

Locally, the AWS SDK reads credentials from an **AWS CLI profile** in `~/.aws/`. That folder is outside the project, so it can never be committed, and the app never stores credentials in `.env` or the database.

### Install the AWS CLI

```bash
brew install awscli
```

```bash
aws --version
```

### Option A (recommended): IAM Identity Center (SSO)

If your AWS account uses IAM Identity Center, create a permission set with the `InfraWatchReadOnly` policy, then run:

```bash
aws configure sso --profile dashboard-readonly
```

```bash
aws sso login --profile dashboard-readonly
```

SSO credentials are short-lived. Run `aws sso login` again when they expire.

### Option B: a dedicated IAM user with access keys

1. **IAM → Users → Create user**, for example `infrawatch-local`. Don't give it console access.
2. Attach the `InfraWatchReadOnly` policy.
3. **Security credentials → Create access key → Local code**.
4. Save the keys into a named profile. They are written to `~/.aws/credentials`, never to the project:

```bash
aws configure --profile dashboard-readonly
```

### Verify the profile can read (and only read)

```bash
aws ec2 describe-instances --profile dashboard-readonly --region us-east-1 --query "Reservations[].Instances[].InstanceId"
```

```bash
aws sts get-caller-identity --profile dashboard-readonly
```

## 4. Switch from MOCK to AWS mode (after Phase 2)

Edit `.env` in the project folder:

```bash
MONITORING_PROVIDER=AWS
AWS_PROFILE=dashboard-readonly
AWS_REGION=us-east-1
```

Restart the dev server (`Ctrl+C`, then `npm run dev`). The top bar badge changes from **Mock** to **Live AWS**.

To go back, set `MONITORING_PROVIDER=MOCK` and restart.

## 5. Credentials on EC2 (production)

Don't create access keys for the server. Instead:

1. **IAM → Roles → Create role → AWS service → EC2**.
2. Attach `InfraWatchReadOnly` and name the role `InfraWatchEC2Role`.
3. **EC2 → your instance → Actions → Security → Modify IAM role** and select `InfraWatchEC2Role`.
4. In the server's `.env`, leave `AWS_PROFILE` **unset**.

The AWS SDK's default credential provider chain then picks up short-lived, auto-rotated credentials from the instance metadata service (IMDSv2).

## 6. Memory and disk usage: CloudWatch Agent

EC2 doesn't publish memory or filesystem usage. The dashboard shows **"No data available: CloudWatch Agent required"** until the agent publishes:

| Dashboard metric | Namespace | Metric name |
| --- | --- | --- |
| Memory Utilization | `CWAgent` | `mem_used_percent` |
| Disk Usage (/) | `CWAgent` | `disk_used_percent` (dimension `path=/`) |

On each Ubuntu instance you want to monitor:

1. Attach the AWS managed policy **`CloudWatchAgentServerPolicy`** to that instance's IAM role. It allows `cloudwatch:PutMetricData`. This is the monitored instance's role, not the dashboard's.
2. Install the agent:

```bash
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
```

```bash
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

(For ARM/Graviton instances, use `ubuntu/arm64` in the URL.)

3. Create `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`:

```json
{
  "agent": { "metrics_collection_interval": 60 },
  "metrics": {
    "append_dimensions": { "InstanceId": "${aws:InstanceId}" },
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  }
}
```

4. Start the agent with that config:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

Metrics appear in CloudWatch after a few minutes. Reference: [Installing the CloudWatch agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html).

## 7. Notes on standard EC2 metrics

- **Basic monitoring** (free) publishes every 5 minutes. **Detailed monitoring** publishes every minute. With basic monitoring the "Last 1 hour" view has about 12 points, not 60.
- **DiskReadOps / DiskWriteOps** in `AWS/EC2` only cover **instance store** volumes on Nitro instances (most current types, such as t3, m6i, c6i). EBS-only Nitro instances show "No data available" here, which is correct. EBS activity is in the `AWS/EBS` namespace.
- Stopped instances publish no metrics, so their charts show "No data available".
