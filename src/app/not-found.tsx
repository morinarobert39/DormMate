import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Card, CardBody } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

/**
 * Shown both for unknown URLs and for `notFound()` calls in the detail pages.
 *
 * Those pages call `notFound()` when a guard refuses access (BR-07, BR-08), which is deliberate:
 * telling a student that request MR-00042 "exists but is not yours" would confirm the existence of
 * another student's record. Indistinguishable-from-missing is the correct answer, so this page has
 * to read naturally for both cases.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>

          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-ink-100">
            <FileQuestion className="size-6 text-ink-500" />
          </div>

          <h1 className="text-lg font-semibold text-ink-900">Faqja nuk u gjet</h1>
          <p className="mt-2 text-sm text-ink-600">
            Faqja që kërkoni nuk ekziston, ose nuk keni qasje në të.
          </p>

          <div className="mt-5">
            <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
              Kthehu në ballinë
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
