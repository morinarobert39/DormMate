import { Building2, QrCode, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/ui/logo";

/**
 * Split layout for the unauthenticated screens: the form on the left, and on the right a dark
 * panel that states what the platform is for. The panel is hidden below `lg`, where the form
 * should own the whole viewport.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <aside className="relative hidden overflow-hidden bg-ink-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo tone="light" />

        <div>
          <h2 className="max-w-md text-3xl leading-tight font-semibold text-white">
            Raporto një problem në konvikt për më pak se një minutë.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-300">
            DormMate zëvendëson formularët në letër dhe paraqitjet në zyrë me një vend të vetëm ku
            çdo kërkesë ka një status, një histori dhe një përgjegjës.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              {
                icon: QrCode,
                title: "Skano dhe raporto",
                body: "Kodi QR në derë e plotëson vetë lokacionin.",
              },
              {
                icon: Building2,
                title: "Ndiq statusin",
                body: "Në Pritje, Në Proces, E Zgjidhur — pa pyetur askënd.",
              },
              {
                icon: ShieldCheck,
                title: "Të dhëna të mbrojtura",
                body: "Çdo përdorues sheh vetëm atë që i takon.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-card bg-ink-800 text-brand-500">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className="block text-sm text-ink-400">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-xs text-ink-500">
          Qendra e Studentëve · Prishtinë
        </p>
      </aside>
    </div>
  );
}
