"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function acceptQuote(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const job = String(form.get("job") || ""),
    quote = String(form.get("quote") || "");
  if (!user) redirect(`/auth/login?next=/customer/jobs/${job}`);
  const { error } = await supabase.rpc("accept_my_quote", {
    p_quote: quote,
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/customer/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/customer");
  revalidatePath(`/customer/jobs/${job}`);
  redirect(`/customer/jobs/${job}?accepted=1`);
}

export async function respondToCompletion(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const job = String(form.get("job") || "");
  const response = String(form.get("response") || "");
  const { error } = await supabase.rpc("respond_to_completion", {
    p_submission: String(form.get("submission") || ""),
    p_response: response,
    p_note: String(form.get("note") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/customer/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath(`/customer/jobs/${job}`);
  redirect(`/customer/jobs/${job}?completion_response=1`);
}

export async function reportIncident(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const job = String(form.get("job") || "");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/customer/jobs/${job}`);
  const { error } = await supabase.rpc("create_incident", {
    p_job: job,
    p_category: String(form.get("category") || "other"),
    p_severity: String(form.get("severity") || "moderate"),
    p_occurred_at: String(form.get("occurred_at") || new Date().toISOString()),
    p_description: String(form.get("description") || ""),
    p_safety_action: String(form.get("safety_action") || ""),
    p_flags: {
      injury: form.get("injury") === "on",
      emergency_services: form.get("emergency_services") === "on",
      damage: form.get("damage") === "on",
      missing_item: form.get("missing_item") === "on",
      hazard: form.get("hazard") === "on",
    },
    p_customer_summary: "A concern was reported and is awaiting MUBER review.",
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/customer/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath(`/customer/jobs/${job}`);
  redirect(`/customer/jobs/${job}?incident_reported=1`);
}
export async function respondToInformationRequest(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const job = String(form.get("job") || "");
  const { error } = await supabase.rpc("respond_to_job_information_request", {
    p_request: String(form.get("request") || ""),
    p_response: String(form.get("response") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/customer/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/customer");
  revalidatePath(`/customer/jobs/${job}`);
  redirect(`/customer/jobs/${job}?information_sent=1`);
}
