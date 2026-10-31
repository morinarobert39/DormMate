import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Rivendos fjalëkalimin",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Logo className="lg:hidden" />
        <h1 className="mt-6 text-2xl font-semibold text-ink-900 lg:mt-0">Rivendos fjalëkalimin</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Shkruaj numrin tënd personal. Administrata e konviktit e rivendos fjalëkalimin dhe ta
          komunikon atë.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-sm text-ink-500">
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          Kthehu te kyçja
        </Link>
      </p>
    </div>
  );
}
