"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOperationalRole } from "@/lib/authorization";
export async function submitCompletion(form: FormData) {
  const { supabase } = await requireOperationalRole(["crew_lead"], "/crew");
  const assignment = String(form.get("assignment") || "");
  const rpc =
    form.get("revision") === "1" ? "revise_completion" : "submit_completion";
  const { error } = await supabase.rpc(rpc, {
    p_assignment: assignment,
    p_payload: {
      completion_at: new Date().toISOString(),
      completion_notes: String(form.get("completion_notes") || ""),
      work_summary: String(form.get("work_summary") || ""),
      items_summary: String(form.get("items_summary") || ""),
      customer_summary: String(form.get("customer_summary") || ""),
      disposal_destination: String(form.get("disposal_destination") || ""),
      donation_destination: String(form.get("donation_destination") || ""),
      disposal_receipt_status: String(
        form.get("disposal_receipt_status") || "not_applicable",
      ),
      damage_declared: form.get("damage_declared") === "on",
      incident_declared: form.get("incident_declared") === "on",
      missing_item_declared: form.get("missing_item_declared") === "on",
      access_issue_declared: form.get("access_issue_declared") === "on",
      additional_scope_declared: form.get("additional_scope_declared") === "on",
      customer_present:
        form.get("customer_present") === "yes"
          ? true
          : form.get("customer_present") === "no"
            ? false
            : null,
    },
    p_request_id: String(form.get("request_id") || crypto.randomUUID()),
  });
  if (error)
    redirect(
      `/crew/completion/${assignment}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/crew");
  redirect("/crew?advanced=1");
}
