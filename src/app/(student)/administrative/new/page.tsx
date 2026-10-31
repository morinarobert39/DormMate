import { PageHeader } from "@/components/layout/page-header";
import { requireStudent } from "@/server/guards";
import { listAdministrativeCategories } from "@/server/services/administrative.service";

import { AdministrativeRequestForm } from "./request-form";

export const metadata = { title: "Kërkesë e re administrative — DormMate" };

export default async function NewAdministrativePage() {
  await requireStudent();
  const categories = await listAdministrativeCategories();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Kërkesë e re administrative"
        description="Paraqisni një kërkesë zyrtare pa pasur nevojë të vini në administratë."
      />
      <AdministrativeRequestForm categories={categories} />
    </div>
  );
}
