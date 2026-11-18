import "server-only";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { EC2Client } from "@aws-sdk/client-ec2";
import { getEnv } from "@/lib/env";

/**
 * AWS SDK v3 clients, created on the server only ("server-only" makes importing
 * this file from a Client Component a build error).
 *
 * Credentials: we never pass any. The SDK's default credential provider chain
 * finds them by itself, in this order (simplified):
 *   1. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY environment variables (not used here)
 *   2. The AWS CLI profile named by AWS_PROFILE, from ~/.aws/config + ~/.aws/credentials
 *      (static keys, IAM Identity Center/SSO, or `aws login`)          <- your Mac
 *   3. The IAM role attached to the EC2 instance (IMDSv2)              <- production
 * So no access key is ever written in code, in .env, or in the database.
 */

interface RegionClients {
  ec2: EC2Client;
  cloudwatch: CloudWatchClient;
}

const clients = new Map<string, RegionClients>();

export function getAwsClients(region: string): RegionClients {
  const existing = clients.get(region);
  if (existing) return existing;

  const { AWS_API_TIMEOUT_MS } = getEnv();
  const config = {
    region,
    // One retry for network blips/throttling. The overall deadline is enforced
    // per call by `callOptions()`, so retries can't exceed AWS_API_TIMEOUT_MS.
    maxAttempts: 2,
    requestHandler: {
      connectionTimeout: Math.min(3000, AWS_API_TIMEOUT_MS),
      requestTimeout: AWS_API_TIMEOUT_MS,
    },
  };
  const created = { ec2: new EC2Client(config), cloudwatch: new CloudWatchClient(config) };
  clients.set(region, created);
  return created;
}

/**
 * Per-call options with a hard deadline (AWS_API_TIMEOUT_MS) that also covers
 * credential resolution and retries:  client.send(command, callOptions())
 * On timeout the SDK throws an AbortError, which `toProviderError` maps to TIMEOUT.
 */
export function callOptions() {
  return { abortSignal: AbortSignal.timeout(getEnv().AWS_API_TIMEOUT_MS) };
}
