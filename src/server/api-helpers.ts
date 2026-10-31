import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthorizationError } from "@/server/guards";

/**
 * Shared plumbing for the REST endpoints in Technical Design §10.
 *
 * Every handler validates, authorises, calls a service, and returns JSON. Errors are translated
 * into a clean Albanian message with the right status and no stack trace — §14 requires that a
 * user-facing error never exposes technical detail.
 */

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Map a thrown error onto a response. Anything unrecognised becomes a generic 500. */
export function handleApiError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return jsonError(error.message, error.status);
  }

  if (error instanceof ZodError) {
    return jsonError(error.issues[0]?.message ?? "Të dhënat nuk janë të vlefshme.", 422);
  }

  console.error("[api]", error);
  return jsonError("Ndodhi një gabim i papritur. Provoni përsëri.", 500);
}

/** Read the filter query-string shared by the request list endpoints. */
export function searchParamsToFilters(url: string) {
  const sp = new URL(url).searchParams;
  return {
    status: sp.get("status") ?? undefined,
    categoryId: sp.get("categoryId") ?? undefined,
    priority: sp.get("priority") ?? undefined,
    q: sp.get("q") ?? undefined,
    page: sp.get("page") ?? 1,
  };
}
