import { Role } from "@/generated/prisma/enums";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

/**
 * Authorization layer.
 *
 * Development Architecture §7.3 requires every protected operation to verify identity, role and
 * privilege. `proxy.ts` only performs an optimistic redirect for unauthenticated visitors — it is
 * explicitly not the security boundary (Next.js proxy documentation). These guards are, and every
 * service function calls one before touching data.
 */

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: number = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** EF-05 — the user is not authenticated. */
export class AuthenticationError extends AuthorizationError {
  constructor(message = "Nuk jeni i identifikuar.") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  email: string | null;
  phone: string | null;
  role: Role;
  dormitoryId: string | null;
  roomId: string | null;
};

/**
 * Load the signed-in user from the database.
 *
 * Reading fresh rather than trusting the JWT is what keeps `dormitoryId` and `roomId` correct
 * immediately after an administrator reassigns a student.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      personalNumber: true,
      email: true,
      phone: true,
      role: true,
      dormitoryId: true,
      roomId: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    personalNumber: user.personalNumber,
    email: user.email,
    phone: user.phone,
    role: user.role,
    dormitoryId: user.dormitoryId,
    roomId: user.roomId,
  };
}

/** Any authenticated user. Throws `AuthenticationError` otherwise (EF-05). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

/**
 * A student. EF-04 — students may never perform administrator actions such as changing a status.
 */
export async function requireStudent(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== Role.STUDENT) {
    throw new AuthorizationError("Kjo faqe është e disponueshme vetëm për studentët.");
  }
  return user;
}

/** An administrator, guaranteed to have a dormitory assigned (BR-08 needs one to scope by). */
export async function requireAdmin(): Promise<SessionUser & { dormitoryId: string }> {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new AuthorizationError("Nuk keni të drejta administrative.");
  }
  if (!user.dormitoryId) {
    throw new AuthorizationError(
      "Llogaria juaj administrative nuk është e lidhur me asnjë konvikt.",
    );
  }
  return { ...user, dormitoryId: user.dormitoryId };
}

/**
 * EF-03 / BR-08 — an administrator may only touch resources inside the dormitory they manage.
 * Called with the dormitory id of whatever record is about to be read or written.
 */
export function assertSameDormitory(
  admin: { dormitoryId: string },
  resourceDormitoryId: string,
): void {
  if (admin.dormitoryId !== resourceDormitoryId) {
    throw new AuthorizationError(
      "Nuk keni qasje në të dhënat e një konvikti tjetër.",
    );
  }
}

/**
 * BR-07 — a student may only read their own requests.
 */
export function assertOwnRequest(user: { id: string }, requestStudentId: string): void {
  if (user.id !== requestStudentId) {
    throw new AuthorizationError("Nuk keni qasje në këtë kërkesë.");
  }
}
