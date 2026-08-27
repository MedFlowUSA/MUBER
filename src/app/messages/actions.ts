"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendJobMessage(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const job = String(form.get("job") || "");
  const channel = String(form.get("channel") || "");
  const body = String(form.get("body") || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(job) || body.length < 1 || body.length > 5000)
    redirect(
      `/messages?job=${encodeURIComponent(job)}&error=Invalid%20message`,
    );
  const { error } = await supabase.rpc("post_job_message", {
    p_job: job,
    p_channel: channel,
    p_body: body,
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/messages?job=${job}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/messages");
  redirect(`/messages?job=${job}&sent=1`);
}

export async function markConversationRead(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const job = String(form.get("job") || "");
  if (/^[0-9a-f-]{36}$/i.test(job))
    await supabase.rpc("mark_job_conversation_read", { p_job: job });
  revalidatePath("/messages");
  redirect(`/messages?job=${job}`);
}
