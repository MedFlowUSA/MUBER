"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";
import { dispatchCommands } from "@/lib/job-status";
export async function transitionJob(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch",
  );
  const job = String(form.get("job") || ""),
    command = String(form.get("command") || ""),
    status = String(form.get("status") || ""),
    reason = String(form.get("reason") || "").trim();
  if (
    !/^[0-9a-f-]{36}$/i.test(job) ||
    !dispatchCommands[status]?.some((x) => x.command === command)
  )
    redirect(`/dispatch/jobs/${job}?error=Invalid%20job%20command`);
  const { error } = await supabase.rpc("transition_job", {
    p_job: job,
    p_command: command,
    p_reason: reason || null,
    p_metadata: { source: "dispatcher_console" },
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/dispatch/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${job}`);
  redirect(`/dispatch/jobs/${job}?updated=1`);
}
export async function saveJobReview(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch",
  );
  const job = String(form.get("job") || ""),
    csv = (name: string) =>
      String(form.get(name) || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
  const { error } = await supabase.rpc("save_internal_job_review", {
    p_job: job,
    p_complexity: String(form.get("complexity") || "standard"),
    p_risks: csv("risk_flags"),
    p_crew_size: Number(form.get("crew_size") || 1),
    p_vehicle: String(form.get("vehicle") || ""),
    p_credentials: csv("credentials"),
    p_notes: String(form.get("notes") || ""),
  });
  if (error)
    redirect(
      `/dispatch/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath(`/dispatch/jobs/${job}`);
  redirect(`/dispatch/jobs/${job}?reviewed=1`);
}
