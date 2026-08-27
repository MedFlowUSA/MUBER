"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";
export async function reviewSupportRequest(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/support",
  );
  const request = String(form.get("request") || ""),
    status = String(form.get("status") || "");
  const { error } = await supabase.rpc("review_support_request", {
    p_request: request,
    p_status: status,
    p_internal_notes: String(form.get("internal_notes") || ""),
    p_resolution: String(form.get("resolution") || ""),
    p_identity_verified: form.get("identity_verified") === "on",
  });
  if (error)
    redirect(`/admin/support?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/support");
  redirect("/admin/support?reviewed=1");
}
