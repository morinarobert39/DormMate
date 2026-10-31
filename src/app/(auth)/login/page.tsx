import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Kyçu",
};

/**
 * UI Architecture §10.1 — Login Screen.
 * Elements: logo, Personal Number field, password field, "Kyçu" button, forgot-password link,
 * and an error message for invalid credentials.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Next.js 16: searchParams is a Promise.
  const params = await searchParams;
  const callbackUrlParam = params?.callbackUrl;
  const callbackUrl = typeof callbackUrlParam === "string" ? callbackUrlParam : "/";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Logo className="lg:hidden" />
        <h1 className="mt-6 text-2xl font-semibold text-ink-900 lg:mt-0">Kyçu në DormMate</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Përdor numrin personal dhe fjalëkalimin që të ka dhënë administrata.
        </p>
      </div>

      <LoginForm callbackUrl={callbackUrl} />

      <p className="text-sm text-ink-500">
        <Link
          href="/forgot-password"
          className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          Keni harruar fjalëkalimin?
        </Link>
      </p>
    </div>
  );
}
