import "dotenv/config";

/**
 * The service layer calls `auth()` from Auth.js to discover the current user. In tests there is no
 * HTTP request to read a cookie from, so the session is stubbed and each test states plainly which
 * user it is acting as by calling `setTestUser`.
 *
 * Everything below the session — guards, services, Prisma, the database — is the real thing. That
 * is deliberate: BR-07, BR-08 and the exception flows are enforced by real queries, and a mocked
 * database would prove nothing about them.
 */

import { vi } from "vitest";

export type TestSession = { user: { id: string } } | null;

const state: { session: TestSession } = { session: null };

export function setTestUser(userId: string | null) {
  state.session = userId ? { user: { id: userId } } : null;
}

vi.mock("@/server/auth", () => ({
  auth: async () => state.session,
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));
