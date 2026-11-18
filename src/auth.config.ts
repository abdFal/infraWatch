import type { NextAuthConfig } from "next-auth";

/**
 * Auth.js settings shared by the full auth setup (src/auth.ts) and the request
 * proxy (src/proxy.ts). Kept free of database/bcrypt imports so the proxy
 * stays lightweight.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  providers: [], // added in src/auth.ts
  callbacks: {
    /**
     * Optimistic check run by the proxy on every matched request.
     * Pages and API routes still verify the session themselves.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);

      // The login page itself decides whether to redirect a signed-in user
      // (it also checks that the account still exists).
      if (pathname === "/login") return true;
      if (pathname.startsWith("/api/")) {
        return isLoggedIn
          ? true
          : Response.json(
              { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
              { status: 401 },
            );
      }
      return isLoggedIn; // false -> redirect to /login
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
