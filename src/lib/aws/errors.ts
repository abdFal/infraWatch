import "server-only";
import { ProviderError } from "@/lib/providers/monitoring-provider";

/**
 * Translates AWS SDK errors into ProviderErrors with messages that are safe to
 * show in the browser. Raw AWS messages contain account IDs, ARNs and policy
 * names, so they only ever go to the server log (see monitoring-service.ts).
 */

const CREDENTIALS_MISSING = new Set(["CredentialsProviderError"]);
const CREDENTIALS_INVALID = new Set([
  "AuthFailure",
  "InvalidClientTokenId",
  "UnrecognizedClientException",
  "SignatureDoesNotMatch",
  "IncompleteSignature",
  "ExpiredToken",
  "ExpiredTokenException",
  "RequestExpired",
  "InvalidToken",
  "TokenRefreshRequired",
]);
const ACCESS_DENIED = new Set([
  "UnauthorizedOperation",
  "AccessDenied",
  "AccessDeniedException",
  "OptInRequired",
]);
const THROTTLED = new Set(["Throttling", "ThrottlingException", "RequestLimitExceeded", "TooManyRequestsException"]);
const TIMEOUT = new Set(["AbortError", "TimeoutError", "RequestTimeout", "RequestTimeoutException"]);
const NETWORK_CODES = new Set(["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "EAI_AGAIN", "ETIMEDOUT", "EHOSTUNREACH"]);

/** EC2 errors that simply mean "no such instance" — answered with 404, not an error. */
export function isInstanceNotFound(error: unknown) {
  const name = (error as { name?: string })?.name ?? "";
  return name === "InvalidInstanceID.NotFound" || name === "InvalidInstanceID.Malformed";
}

export function toProviderError(error: unknown, region: string): ProviderError {
  if (error instanceof ProviderError) return error;

  const err = error as { name?: string; code?: string; message?: string };
  const name = err?.name ?? "";
  const message = err?.message ?? "";

  if (CREDENTIALS_MISSING.has(name) || /could not load credentials|sso session .* expired|token .* expired/i.test(message)) {
    // SSO / `aws login` sessions that expired also surface here.
    return new ProviderError(
      "NOT_CONFIGURED",
      "AWS credentials were not found or have expired. Set AWS_PROFILE to an AWS CLI profile (and run `aws sso login` / `aws login` again if it uses a session), then restart the app.",
      { cause: error },
    );
  }
  if (CREDENTIALS_INVALID.has(name)) {
    return new ProviderError(
      "INVALID_CREDENTIALS",
      `AWS rejected the credentials. They may be invalid, deactivated or expired, or the region ${region} may not be enabled for your account.`,
      { cause: error },
    );
  }
  if (ACCESS_DENIED.has(name)) {
    return new ProviderError(
      "ACCESS_DENIED",
      `Your AWS identity is not allowed to read EC2/CloudWatch data in ${region}. Attach the InfraWatchReadOnly policy, and check that your organization allows this region.`,
      { cause: error },
    );
  }
  if (THROTTLED.has(name)) {
    return new ProviderError("THROTTLED", "AWS is throttling requests. Try again in a moment, or use a longer refresh interval.", {
      cause: error,
    });
  }
  if (TIMEOUT.has(name) || (err?.code && TIMEOUT.has(err.code))) {
    return new ProviderError("TIMEOUT", "AWS did not respond in time. Check your network connection and try again.", {
      cause: error,
    });
  }
  if (err?.code && NETWORK_CODES.has(err.code)) {
    return new ProviderError("UNAVAILABLE", "Cannot reach AWS. Check your internet connection.", { cause: error });
  }
  return new ProviderError("UNAVAILABLE", "AWS is currently unavailable. Try again shortly.", { cause: error });
}
