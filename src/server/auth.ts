import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { loginSchema } from "@/lib/validation/auth";
import { authConfig } from "@/server/auth.config";
import { prisma } from "@/server/db";

/**
 * Technical Design §11 — users authenticate with their Personal Number (Numri Personal) and a
 * password, not an email address.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        personalNumber: { label: "Numri Personal", type: "text" },
        password: { label: "Fjalëkalimi", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { personalNumber: parsed.data.personalNumber },
        });

        // Compare against a dummy hash when the user does not exist so that a wrong personal
        // number and a wrong password take the same amount of time to reject.
        const passwordHash = user?.passwordHash ?? DUMMY_HASH;
        const passwordMatches = await compare(parsed.data.password, passwordHash);

        if (!user || !passwordMatches || !user.isActive) return null;

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});

/** bcrypt hash of a value no one can submit; used only to equalise failed-login timing. */
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.4nS0JLZmS4b9nqYq5aQ0uSJk4Gd6";
