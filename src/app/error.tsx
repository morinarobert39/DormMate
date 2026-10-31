"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

/**
 * Technical Design §14 — every error must reach the user as an understandable message, never as
 * raw technical output. Without this boundary a thrown error renders the framework's default
 * crash screen: untranslated, unstyled, and with no way back into the application.
 *
 * The `digest` is deliberately shown. It is the only handle a user can quote that matches the
 * stack trace recorded in the server logs, which is what makes a reported problem diagnosable.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-urgent-bg">
            <TriangleAlert className="size-6 text-urgent-fg" />
          </div>

          <h1 className="text-lg font-semibold text-ink-900">Ndodhi një gabim</h1>
          <p className="mt-2 text-sm text-ink-600">
            Faqja nuk mund të ngarkohej. Provoni përsëri, dhe nëse problemi vazhdon kontaktoni
            administratën.
          </p>

          {error.digest ? (
            <p className="mt-3 font-mono text-xs text-ink-400">Kodi i gabimit: {error.digest}</p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={reset}>
              <RotateCcw className="size-4" />
              Provo përsëri
            </Button>
            <Link
              href="/"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Kthehu në ballinë
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
