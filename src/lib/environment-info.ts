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
    credentialSource:
      env.MONITORING_PROVIDER === "AWS"
        ? "AWS SDK default credential provider chain (IAM role on EC2, or AWS CLI profile locally)"
        : "Not used (MOCK mode)",
  };
}

export type EnvironmentInfo = ReturnType<typeof getEnvironmentInfo>;
