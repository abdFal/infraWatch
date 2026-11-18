import "server-only";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { clientIpFrom, logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { clearFailures, isRateLimited, recordFailure } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation/schemas";

// A real bcrypt hash of a random string. Comparing against it when the user
// doesn't exist keeps response times similar, so attackers can't probe which
// email addresses have accounts.
const DUMMY_HASH = "$2b$12$viqVmhcoNkGiXB0vxTrXqO0.2UH3uJNw.AAJGbrMjah6V.8U2romW";

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const ipAddress = clientIpFrom(request.headers);
        const limiterKey = `${email}|${ipAddress ?? "unknown"}`;
        if (isRateLimited(limiterKey)) {
          await logActivity({
            action: "LOGIN_FAILED",
            description: `Login blocked after repeated failures for ${email}`,
            ipAddress,
          });
          throw new RateLimitedError();
        }

        const user = await db.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        if (!user || !valid) {
          recordFailure(limiterKey);
          await logActivity({
            action: "LOGIN_FAILED",
            description: `Failed login attempt for ${email}`,
            userId: user?.id,
            ipAddress,
          });
          return null;
        }

        clearFailures(limiterKey);
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await logActivity({
          action: "LOGIN_SUCCESS",
          description: `${user.name} signed in`,
          userId: user.id,
          ipAddress,
        });

        // Only these fields go into the session token. Never the password hash.
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
