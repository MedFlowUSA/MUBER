"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";

export async function reviewIncident(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "compliance_admin", "super_admin"],
    "/dispatch/incidents",
  );
  const { error } = await supabase.rpc("review_incident", {
    p_incident: String(form.get("incident") || ""),
    p_action: String(form.get("action") || ""),
    p_severity: String(form.get("severity") || "") || null,
    p_message: String(form.get("message") || ""),
    p_internal_notes: String(form.get("internal_notes") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/dispatch/incidents?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dispatch/incidents");
  redirect("/dispatch/incidents?updated=1");
}

export async function closeJob(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch/incidents",
  );
  const job = String(form.get("job") || "");
  const { data, error } = await supabase.rpc("close_job", {
    p_job: job,
    p_reason: String(form.get("reason") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/dispatch/incidents?error=${encodeURIComponent(error.message)}`);
  if (!data?.closed)
    redirect(
      `/dispatch/incidents?error=${encodeURIComponent((data?.blockers || []).join("; ") || "Job is not eligible for closure")}`,
    );
  revalidatePath("/dispatch");
  redirect("/dispatch/incidents?closed=1");
}
