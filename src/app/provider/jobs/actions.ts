"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";
export async function scheduleAssignment(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/jobs",
  );
  const assignment = String(form.get("assignment") || ""),
    vehicle = String(form.get("vehicle") || ""),
    crew = String(form.get("crew") || "");
  const start = new Date(String(form.get("start") || "")),
    end = new Date(String(form.get("end") || ""));
  if (!assignment || !vehicle || !crew || isNaN(+start) || isNaN(+end))
    redirect("/provider/jobs?error=Complete%20all%20scheduling%20fields");
  const { error } = await supabase.rpc("configure_assignment", {
    p_assignment: assignment,
    p_vehicle: vehicle,
    p_crew: crew,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/provider/jobs?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/provider/jobs");
  revalidatePath("/provider/dashboard");
  redirect("/provider/jobs?scheduled=1");
}
