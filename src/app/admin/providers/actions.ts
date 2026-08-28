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
  const applicantMessage = String(form.get("applicant_message") || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(application) || !allowed.has(decision)) {
    redirect("/admin/providers?error=Invalid%20review%20request");
  }
  if (
    ["information_requested", "rejected", "suspended"].includes(decision) &&
    reason.length < 10
  ) {
    redirect("/admin/providers?error=A%20specific%20reason%20is%20required");
  }
  if (decision === "information_requested" && applicantMessage.length < 10) {
    redirect(
      "/admin/providers?error=A%20contractor-safe%20information%20request%20is%20required",
    );
  }
  const { error } = await supabase.rpc("review_provider_application_v2", {
    p_application: application,
    p_decision: decision,
    p_internal_reason: reason || null,
    p_applicant_message:
      decision === "information_requested" ? applicantMessage : null,
  });
  if (error) {
    redirect(`/admin/providers?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin/providers");
  redirect("/admin/providers?reviewed=1");
}

export async function manageProviderStatus(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/providers",
  );
  const provider = String(form.get("provider") || "");
  const action = String(form.get("provider_action") || "");
  if (
    !/^[0-9a-f-]{36}$/i.test(provider) ||
    !["suspend", "reactivate"].includes(action)
  )
    redirect("/admin/providers?error=Invalid%20provider%20status%20request");
  const reviewValue = String(form.get("review_at") || "");
  const reviewAt = reviewValue ? new Date(reviewValue) : null;
  if (reviewAt && Number.isNaN(reviewAt.getTime()))
    redirect("/admin/providers?error=Invalid%20review%20date");
  const { data, error } = await supabase.rpc("manage_provider_status", {
    p_provider: provider,
    p_action: action,
    p_reason_category: String(form.get("reason_category") || ""),
    p_internal_reason: String(form.get("internal_reason") || ""),
    p_customer_message: String(form.get("customer_message") || ""),
    p_review_at: reviewAt?.toISOString() || null,
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/admin/providers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/providers");
  revalidatePath("/dispatch");
  redirect(
    `/admin/providers?provider_updated=1&active_jobs=${data?.active_job_count || 0}`,
  );
}
