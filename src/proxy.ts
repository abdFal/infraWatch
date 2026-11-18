import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Next.js 16 "proxy" (formerly middleware). Runs before matching requests and
 * redirects signed-out users to /login (or returns 401 for /api routes).
 * This is a first line of defence only: every page and API route verifies the
 * session again on the server.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Everything except Auth.js endpoints, the health check, and static assets.
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
