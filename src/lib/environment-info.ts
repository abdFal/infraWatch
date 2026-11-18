import "server-only";
import packageJson from "../../package.json";
import { getEnv } from "@/lib/env";

/**
 * Non-sensitive runtime information for the Settings page.
 * Deliberately excludes secrets, connection strings, hostnames and credentials.
 */
export function getEnvironmentInfo() {
  const env = getEnv();
  return {
    appVersion: packageJson.version,
    nodeEnv: env.NODE_ENV,
    nodeVersion: process.version,
    providerMode: env.MONITORING_PROVIDER,
    defaultRegion: env.AWS_REGION,
    awsApiTimeoutMs: env.AWS_API_TIMEOUT_MS,
    // Only describes WHERE credentials come from. The profile name and the
    // credentials themselves are never sent to the browser.
    credentialSource:
      env.MONITORING_PROVIDER === "MOCK"
        ? "Not used (MOCK mode)"
        : env.AWS_PROFILE
          ? "AWS CLI named profile (AWS_PROFILE), via the AWS SDK default credential provider chain"
          : "AWS SDK default credential provider chain (IAM role on EC2)",
  };
}

export type EnvironmentInfo = ReturnType<typeof getEnvironmentInfo>;
