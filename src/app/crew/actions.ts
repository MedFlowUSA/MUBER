"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";
export async function confirmCrewAssignment(form: FormData) {
  const { supabase } = await requireOperationalRole(["crew_lead"], "/crew");
  const { error } = await supabase.rpc("crew_confirm_assignment", {
    p_assignment: String(form.get("assignment") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error) redirect(`/crew?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/crew");
  redirect("/crew?confirmed=1");
}
export async function advanceFieldWork(form: FormData) {
  const { supabase } = await requireOperationalRole(["crew_lead"], "/crew");
  const command = String(form.get("command") || "");
  if (
    ![
      "mark_ready",
      "start_en_route",
      "mark_arrived",
      "start_work",
      "request_completion_review",
    ].includes(command)
  )
    redirect("/crew?error=Invalid%20job%20action");
  const { error } = await supabase.rpc("advance_crew_assignment", {
    p_assignment: String(form.get("assignment") || ""),
    p_command: command,
    p_request_id: crypto.randomUUID(),
  });
  if (error) redirect(`/crew?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/crew");
  revalidatePath("/customer");
  redirect("/crew?advanced=1");
}
