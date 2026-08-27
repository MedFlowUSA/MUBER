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
