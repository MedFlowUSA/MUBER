"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function submitSupportRequest(form: FormData) {
  if (String(form.get("company_website") || ""))
    redirect("/support?submitted=1");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_support_request", {
    p_category: String(form.get("category") || ""),
    p_name: String(form.get("name") || ""),
    p_email: String(form.get("email") || ""),
    p_subject: String(form.get("subject") || ""),
    p_details: String(form.get("details") || ""),
    p_job_reference: String(form.get("job_reference") || ""),
  });
  if (error) redirect(`/support?error=${encodeURIComponent(error.message)}`);
  redirect(`/support?submitted=${String(data).slice(0, 8)}`);
}
