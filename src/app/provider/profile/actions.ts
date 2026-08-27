"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";

export async function updateCompanyProfile(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/profile",
  );
  let operatingHours: unknown;
  try {
    operatingHours = JSON.parse(String(form.get("operating_hours") || "{}"));
  } catch {
    redirect(
      "/provider/profile?error=Operating%20hours%20must%20be%20valid%20JSON",
    );
  }
  const { error } = await supabase.rpc("update_my_provider_profile", {
    p_data: {
      display_name: String(form.get("display_name") || ""),
      business_email: String(form.get("business_email") || ""),
      business_phone: String(form.get("business_phone") || ""),
      website: String(form.get("website") || ""),
      service_area: { description: String(form.get("service_area") || "") },
      operating_hours: operatingHours,
      available: form.get("available") === "on",
      same_day_available: form.get("same_day_available") === "on",
    },
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/provider/profile?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/provider/profile");
  revalidatePath("/provider/dashboard");
  redirect("/provider/profile?updated=1");
}
