import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/server/guards";

/**
 * Technical Design Figura 11.1 — after authentication the user is routed to the dashboard that
 * matches their role.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  redirect(user.role === Role.ADMIN ? "/admin" : "/dashboard");
}
