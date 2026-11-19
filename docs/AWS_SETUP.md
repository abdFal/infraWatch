# AWS integration setup

> **Status:** implemented (Phase 2). The quickest path, with every command in order, is **[README §6](../README.md#6-connect-your-aws-account-phase-2)**. This page is the reference: what is called, why, the alternatives (SSO, EC2 role) and the CloudWatch Agent.

Code: `src/lib/aws/client.ts` (SDK clients, timeouts), `ec2.ts` (instances), `cloudwatch.ts` (metrics), `errors.ts` (safe error messages), `src/lib/providers/aws-provider.ts` (the provider) and `src/lib/monitoring-service.ts` (combines AWS with mock data).

## 1. What the dashboard calls

The app is **read-only**. It calls exactly four AWS APIs:

| API | Used for |
| --- | --- |
| `ec2:DescribeInstances` | Instance list and details (ID, name tag, type, AZ, state, IPs, launch time) |
| `ec2:DescribeInstanceStatus` | System and instance status checks (the "Degraded" status) |
| `cloudwatch:GetMetricData` | Metric time series (CPU, network, disk ops, memory, disk usage) |
| `cloudwatch:ListMetrics` | Finding CloudWatch Agent disk metrics, whose dimensions (`path`, `device`, `fstype`) vary per instance |

Users can't trigger any other AWS call. The browser only talks to fixed API routes in this app, inputs are validated with Zod, and the region must come from a fixed allow-list.

How each call is used:

- **DescribeInstances** pages through every instance with `NextToken` (1,000 per page). The SDK object is mapped to the dashboard's own shape (`src/lib/types.ts`), and nothing else leaves the server.
- **DescribeInstanceStatus** runs with `IncludeAllInstances: true`. Without it, AWS only returns running instances.
- **GetMetricData** fetches all seven series for one instance in a single request. `Sum` metrics (network, disk ops) are divided by the period to show per-second rates.
- **ListMetrics** finds the exact dimensions the CloudWatch Agent used (`InstanceId`, and often `ImageId`, `InstanceType`, `path`, `device`, `fstype`). GetMetricData only matches an exact dimension set. If nothing is found, the chart says "CloudWatch Agent required".

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
aws configure sso --profile infrawatch-readonly
```

```bash
aws sso login --profile infrawatch-readonly
```

SSO credentials are short-lived. Run `aws sso login` again when they expire.

### Option B: a dedicated IAM user with access keys

With the AWS CLI, follow [README §6.3–6.4](../README.md#63-create-a-dedicated-iam-user-for-the-dashboard). Or in the AWS Console:

1. **IAM → Users → Create user** named `infrawatch-readonly`. Don't give it console access.
2. Attach the `InfraWatchReadOnly` policy.
3. **Security credentials → Create access key → Local code**.
4. Save the keys into a named profile. They are written to `~/.aws/credentials`, never to the project:

```bash
aws configure --profile infrawatch-readonly
```

Rotate the key from time to time (create a new one, update the profile, delete the old one). Never put the keys in `.env`.

### Option C: an existing profile

Any profile works, including an `aws login` session. But an admin profile gives the dashboard far more access than it needs. Prefer a profile limited to `InfraWatchReadOnly`.

### Verify the profile can read (and only read)

```bash
aws ec2 describe-instances --profile infrawatch-readonly --region ap-southeast-2 --query "Reservations[].Instances[].InstanceId"
```

```bash
aws sts get-caller-identity --profile infrawatch-readonly
```

## 4. Choose the data sources

Edit `.env` in the project folder:

```bash
MONITORING_PROVIDER=HYBRID        # or AWS, or MOCK
AWS_PROFILE=infrawatch-readonly
AWS_REGION=ap-southeast-2
```

| Mode | Top bar | Behaviour when AWS fails |
| --- | --- | --- |
| `HYBRID` | **AWS + Mock** | Mock instances stay visible. A red "AWS data unavailable" banner and the Overview **Data sources** card show the reason. |
| `AWS` | **Live AWS** | Pages show the error (HTTP 503). Never mock data. |
| `MOCK` | **Mock data** | No AWS calls at all. |

Restart the dev server (`Ctrl+C`, then `npm run dev`), then choose the region in **Settings**.

Each instance is identified by **source + instance ID**. Detail URLs include the source (`/instances/aws/i-…` or `/instances/mock/i-…`), and API calls go only to the provider that owns that instance.

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

The dashboard finds these metrics by `InstanceId`, so the agent config must append that dimension. The ready-made config is [deploy/cloudwatch-agent/amazon-cloudwatch-agent.json](../deploy/cloudwatch-agent/amazon-cloudwatch-agent.json).

On each Ubuntu instance you want to monitor:

1. **Let the instance publish metrics (Mac).** Add [iam-cwagent-policy.json](iam-cwagent-policy.json) to the instance's IAM role. It allows only `cloudwatch:PutMetricData`, and only into the `CWAgent` namespace:

   ```bash
   aws iam put-role-policy --role-name InfraWatchEC2Role --policy-name InfraWatchAgentPublish --policy-document file://docs/iam-cwagent-policy.json --profile default
   ```

   The AWS managed policy `CloudWatchAgentServerPolicy` also works, but it allows more (CloudWatch Logs, SSM parameters, any metric namespace).

   When the dashboard runs on the instance it monitors, both share one role: the role can then write agent metrics, while the dashboard's code still only reads.

2. **Install the agent (server).** For ARM/Graviton instances, use `ubuntu/arm64` in the URL.

   ```bash
   wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
   ```

   ```bash
   sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
   ```

3. **Install the config (server, in the app folder):**

   ```bash
   sudo cp deploy/cloudwatch-agent/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
   ```

4. **Start the agent with that config (server).** It also starts on every boot.

   ```bash
   sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
   ```

5. **Check (server, then Mac):**

   ```bash
   sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
   ```

   ```bash
   aws cloudwatch list-metrics --namespace CWAgent --region ap-southeast-2 --output table
   ```

The first datapoints arrive after 1–2 minutes. The dashboard caches the list of agent metrics for 5 minutes, so the charts can take up to about 7 minutes to appear. Each metric the agent sends is a CloudWatch custom metric (the first 10 are in the free tier). Reference: [Installing the CloudWatch agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html).

| Problem | Check |
| --- | --- |
| `status` is not `running` | `sudo tail -50 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log` |
| Log shows `AccessDenied` for `PutMetricData` | Step 1 is missing, or the role isn't attached to the instance |
| Metrics exist but the dashboard still says "Agent required" | Wait 5 minutes (cache), or the metrics lack the `InstanceId` dimension (config without `append_dimensions`) |

## 7. Notes on standard EC2 metrics

- **Basic monitoring** (free) publishes every 5 minutes. **Detailed monitoring** publishes every minute. For basic-monitoring instances the dashboard uses at least a 5-minute period, so "Last 1 hour" has 12 points, not 60. Requesting 1-minute periods there would return 5-minute sums, and dividing those by 60 would overstate network and disk rates five times.
- New instances need 5–10 minutes before their first datapoints appear.
- Nothing is ever interpolated or invented. Gaps in CloudWatch stay gaps, and an empty result is shown as "No data available".
- **DiskReadOps / DiskWriteOps** in `AWS/EC2` only cover **instance store** volumes on Nitro instances (most current types, such as t3, m6i, c6i). EBS-only Nitro instances show "No data available" here, which is correct. EBS activity is in the `AWS/EBS` namespace.
- Stopped instances publish no metrics, so their charts show "No data available".
