/**
 * AWS commercial regions selectable in Settings.
 * A fixed allow-list: users can only pick from these values, never type an
 * arbitrary endpoint or region string.
 */
export const AWS_REGIONS = [
  { code: "us-east-1", name: "US East (N. Virginia)" },
  { code: "us-east-2", name: "US East (Ohio)" },
  { code: "us-west-1", name: "US West (N. California)" },
  { code: "us-west-2", name: "US West (Oregon)" },
  { code: "ca-central-1", name: "Canada (Central)" },
  { code: "sa-east-1", name: "South America (São Paulo)" },
  { code: "eu-west-1", name: "Europe (Ireland)" },
  { code: "eu-west-2", name: "Europe (London)" },
  { code: "eu-west-3", name: "Europe (Paris)" },
  { code: "eu-central-1", name: "Europe (Frankfurt)" },
  { code: "eu-north-1", name: "Europe (Stockholm)" },
  { code: "ap-south-1", name: "Asia Pacific (Mumbai)" },
  { code: "ap-southeast-1", name: "Asia Pacific (Singapore)" },
  { code: "ap-southeast-2", name: "Asia Pacific (Sydney)" },
  { code: "ap-southeast-3", name: "Asia Pacific (Jakarta)" },
  { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
  { code: "ap-northeast-2", name: "Asia Pacific (Seoul)" },
  { code: "ap-northeast-3", name: "Asia Pacific (Osaka)" },
  { code: "ap-east-1", name: "Asia Pacific (Hong Kong)" },
  { code: "me-central-1", name: "Middle East (UAE)" },
  { code: "af-south-1", name: "Africa (Cape Town)" },
] as const;

export const AWS_REGION_CODES = AWS_REGIONS.map((r) => r.code) as [string, ...string[]];

export function regionName(code: string) {
  return AWS_REGIONS.find((r) => r.code === code)?.name ?? code;
}
