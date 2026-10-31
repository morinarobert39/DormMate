import type { DefaultSession } from "next-auth";

import type { Role } from "@/generated/prisma/enums";

/**
 * The session token deliberately carries only the user id and role.
 *
 * Mutable facts such as `dormitoryId` and `roomId` are read fresh from the database by the guards
 * in `src/server/guards.ts`. If they were cached in the JWT, an administrator moving a student to a
 * different room would leave that student's room-lock (EF-02) pointing at their old room until the
 * token expired.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

// `next-auth/jwt` only re-exports from `@auth/core/jwt`, so the JWT interface must be augmented
// where it is actually declared — augmenting the re-export would silently create a second,
// unrelated interface and leave `token.role` typed as `unknown`.
declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
  }
}
