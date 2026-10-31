import type { NextAuthConfig } from "next-auth";

/**
 * Database-free half of the Auth.js setup.
 *
 * `proxy.ts` imports this file so route protection never pulls Prisma or bcrypt into the request
 * path. The Credentials provider that does touch the database is added in `auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    // Credentials-based sign-in requires JWT sessions; Auth.js cannot persist a database session
    // for a provider it did not issue an account record for.
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // one working day
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on the request that signs in.
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
