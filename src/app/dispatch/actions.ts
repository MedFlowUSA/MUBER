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

const cents = (value: FormDataEntryValue | null) => {
  const text = String(value || "").trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text))
    throw new Error("Invalid money amount");
  const [whole, decimal = ""] = text.split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
};

export async function createQuote(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch",
  );
  const job = String(form.get("job") || "");
  let amounts: {
    service: number;
    disposal: number;
    travel: number;
    other: number;
    provider: number | null;
  };
  try {
    amounts = {
      service: cents(form.get("service")),
      disposal: cents(form.get("disposal")),
      travel: cents(form.get("travel")),
      other: cents(form.get("other")),
      provider: String(form.get("provider") || "").trim()
        ? cents(form.get("provider"))
        : null,
    };
  } catch {
    redirect(`/dispatch/jobs/${job}?error=Enter%20valid%20currency%20amounts`);
  }
  const expiration = new Date(String(form.get("expires") || ""));
  if (Number.isNaN(expiration.getTime()))
    redirect(
      `/dispatch/jobs/${job}?error=Choose%20a%20valid%20quote%20expiration`,
    );
  const { error } = await supabase.rpc("create_quote_version", {
    p_job: job,
    p_service: amounts.service,
    p_disposal: amounts.disposal,
    p_travel: amounts.travel,
    p_other: amounts.other,
    p_scope: String(form.get("scope") || ""),
    p_internal_notes: String(form.get("internal_notes") || ""),
    p_provider_compensation: amounts.provider,
    p_expires: expiration.toISOString(),
  });
  if (error)
    redirect(
      `/dispatch/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath(`/dispatch/jobs/${job}`);
  redirect(`/dispatch/jobs/${job}?quote=1`);
}

export async function sendQuote(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch",
  );
  const job = String(form.get("job") || ""),
    quote = String(form.get("quote") || "");
  const { error } = await supabase.rpc("send_quote", {
    p_quote: quote,
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/dispatch/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${job}`);
  redirect(`/dispatch/jobs/${job}?sent=1`);
}

export async function createProviderOffer(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch",
  );
  const job = String(form.get("job") || "");
  const provider = String(form.get("provider") || "");
  const expiration = new Date(String(form.get("expires") || ""));
  const duration = Number(form.get("duration") || 0);
  if (Number.isNaN(expiration.getTime()) || !Number.isInteger(duration))
    redirect(`/dispatch/jobs/${job}?error=Invalid%20offer%20timing`);
  const { error } = await supabase.rpc("create_provider_offer", {
    p_job: job,
    p_provider: provider,
    p_duration_minutes: duration,
    p_expires: expiration.toISOString(),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/dispatch/jobs/${job}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${job}`);
  redirect(`/dispatch/jobs/${job}?offered=1`);
}
