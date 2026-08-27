"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";
export async function reviewCompletion(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch/completions",
  );
  const submission = String(form.get("submission") || ""),
    action = String(form.get("action") || "");
  const { error } = await supabase.rpc("review_completion", {
    p_submission: submission,
    p_action: action,
    p_reason: String(form.get("reason") || ""),
    p_customer_message: String(form.get("customer_message") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/dispatch/completions?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/dispatch/completions");
  revalidatePath("/dispatch");
  redirect("/dispatch/completions?updated=1");
}
