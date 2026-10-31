import { signOut } from "@/server/auth";

/** Technical Design §10 — /api/auth/logout equivalent; ends the session and returns to login. */
export async function POST() {
  await signOut({ redirectTo: "/login" });
}
