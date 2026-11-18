import "server-only";
import { z } from "zod";

/**
 * Server-side environment variables, validated once at startup.
 * Importing this module from a Client Component fails the build ("server-only"),
 * so none of these values can leak into the browser bundle.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  // HYBRID = mock + real AWS side by side, MOCK = demo data only, AWS = real data only.
  MONITORING_PROVIDER: z.enum(["HYBRID", "MOCK", "AWS"]).default("MOCK"),
  AWS_REGION: z
    .string()
    .regex(/^[a-z]{2}(-gov)?-[a-z]+-\d$/, "AWS_REGION must look like us-east-1")
    .default("us-east-1"),
  AWS_API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  // Only a NAME of an AWS CLI profile (~/.aws/config). The SDK reads it itself;
  // the app never sees or stores the credentials behind it.
  AWS_PROFILE: z
    .string()
    .regex(/^[\w+=,.@-]{1,64}$/, "AWS_PROFILE must be a profile name from ~/.aws/config")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}
