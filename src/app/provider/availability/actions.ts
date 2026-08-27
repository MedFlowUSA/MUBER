"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";
export async function setAvailability(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/availability",
  );
  const { error } = await supabase.rpc("set_my_provider_availability", {
    p_date: String(form.get("date") || ""),
    p_status: String(form.get("status") || ""),
    p_capacity: Number(form.get("capacity") || 0) || null,
    p_notes: String(form.get("notes") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/provider/availability?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/provider/availability");
  revalidatePath("/provider/dashboard");
  redirect("/provider/availability?updated=1");
}
export async function removeAvailability(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/availability",
  );
  const { error } = await supabase.rpc("remove_my_provider_availability", {
    p_day: String(form.get("day") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/provider/availability?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/provider/availability");
  redirect("/provider/availability?removed=1");
}
