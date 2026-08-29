"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const list = (value: FormDataEntryValue | null) =>
  String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
export async function submitProviderApplication(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/contractor/login?next=/provider/apply");
  const payload = {
    applicant_id: user.id,
    legal_name: String(form.get("legal_name") || "").trim(),
    dba_name: String(form.get("dba_name") || "").trim() || null,
    business_email: String(form.get("business_email") || "").trim(),
    business_phone: String(form.get("business_phone") || "").trim(),
    contact_name: String(form.get("contact_name") || "").trim(),
    business_address: {
      formatted: String(form.get("business_address") || "").trim(),
    },
    service_categories: form.getAll("service_categories").map(String),
    service_territory: String(form.get("service_territory") || "").trim(),
    years_in_business: Number(form.get("years_in_business") || 0),
    website: String(form.get("website") || "").trim() || null,
    moving_services: list(form.get("moving_services")),
    removal_services: list(form.get("removal_services")),
    vehicle_types: list(form.get("vehicle_types")),
    crew_capacity: Number(form.get("crew_capacity") || 1),
    operating_hours: {
      description: String(form.get("operating_hours") || "").trim(),
    },
    same_day_available: form.get("same_day_available") === "on",
    commercial_auto_status: String(
      form.get("commercial_auto_status") || "not_provided",
    ),
    liability_status: String(form.get("liability_status") || "not_provided"),
    cargo_status: String(form.get("cargo_status") || "not_provided"),
    ca_mover_permit_status: String(
      form.get("ca_mover_permit_status") || "not_provided",
    ),
    disposal_capability: form.get("disposal_capability") === "on",
    background_consent: form.get("background_consent") === "on",
    agreement_accepted: form.get("agreement_accepted") === "on",
    authorized_representative_attested:
      form.get("authorized_representative_attested") === "on",
    no_guarantee_acknowledged: form.get("no_guarantee_acknowledged") === "on",
    notes: String(form.get("notes") || "").trim(),
  };
  const { data, error } = await supabase
    .from("provider_applications")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data)
    redirect("/provider/apply?error=Application%20could%20not%20be%20saved");
  const submitted = await supabase.rpc("submit_provider_application", {
    p_id: data.id,
  });
  if (submitted.error)
    redirect("/provider/apply?error=Complete%20all%20required%20consents");
  redirect("/provider/apply?submitted=1");
}

export async function resubmitProviderInformation(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/contractor/login?next=/provider/apply");
  const response = String(form.get("response") || "").trim();
  if (response.length < 10 || response.length > 4000)
    redirect("/provider/apply?error=Provide%20a%20complete%20response");
  const { error } = await supabase.rpc("resubmit_provider_application", {
    p_response: response,
  });
  if (error)
    redirect(
      "/provider/apply?error=The%20response%20could%20not%20be%20submitted",
    );
  redirect("/provider/apply?resubmitted=1");
}
