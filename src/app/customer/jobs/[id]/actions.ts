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
