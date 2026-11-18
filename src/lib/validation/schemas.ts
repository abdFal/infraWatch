import { z } from "zod";
import { AWS_REGION_CODES } from "@/lib/aws/regions";
import { REFRESH_INTERVAL_VALUES, TIME_RANGE_KEYS } from "@/lib/time-ranges";
import { INSTANCE_STATES } from "@/lib/types";

/** Input validation for every API route and form. */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(254).transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Password is required").max(200),
});

// EC2 instance IDs: "i-" followed by 8 or 17 hex characters.
export const instanceIdSchema = z.string().regex(/^i-[0-9a-f]{8}([0-9a-f]{9})?$/, "Invalid instance ID");

export const timeRangeSchema = z.enum(TIME_RANGE_KEYS);

export const instanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
  search: z
    .string()
    .trim()
    .max(100)
    .regex(/^[\w\-. ]*$/, "Search may only contain letters, numbers, spaces, '-', '_' and '.'")
    .optional()
    .transform((v) => (v ? v : undefined)),
  // A specific EC2 state, or "transitional" (pending + stopping + shutting-down).
  state: z.enum([...INSTANCE_STATES, "transitional"]).optional(),
});

export const metricsQuerySchema = z.object({
  range: timeRangeSchema.default("3h"),
});

export const ACTIVITY_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "SETTINGS_UPDATED",
  "PREFERENCES_UPDATED",
  "PROVIDER_ERROR",
  "SYSTEM",
] as const;

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  action: z.enum(ACTIVITY_ACTIONS).optional(),
});

export const preferencesSchema = z.object({
  refreshIntervalSec: z
    .number()
    .int()
    .refine((v) => REFRESH_INTERVAL_VALUES.includes(v), "Unsupported refresh interval"),
  defaultTimeRange: timeRangeSchema,
});

export const appSettingsSchema = z.object({
  awsRegion: z.enum(AWS_REGION_CODES),
});
