"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";

const allowed = new Set([
  "under_review",
  "information_requested",
  "approved",
  "rejected",
  "suspended",
]);

export async function reviewProviderApplication(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/providers",
  );
  const application = String(form.get("application") || "");
  const decision = String(form.get("decision") || "");
  const reason = String(form.get("reason") || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(application) || !allowed.has(decision)) {
    redirect("/admin/providers?error=Invalid%20review%20request");
  }
  if (
    ["information_requested", "rejected", "suspended"].includes(decision) &&
    reason.length < 10
  ) {
    redirect("/admin/providers?error=A%20specific%20reason%20is%20required");
  }
  const { error } = await supabase.rpc("review_provider_application", {
    p_application: application,
    p_decision: decision,
    p_internal_reason: reason || null,
  });
  if (error) {
    redirect(`/admin/providers?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin/providers");
  redirect("/admin/providers?reviewed=1");
}
