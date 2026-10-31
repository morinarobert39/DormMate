"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Opens the browser print dialog. Client-only, because `window.print` needs the browser. */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="size-4" />
      Printo
    </Button>
  );
}
