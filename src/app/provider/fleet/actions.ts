"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { requireOperationalRole } from "@/lib/authorization";
const csv = (v: FormDataEntryValue | null) =>
  String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
export async function createVehicle(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/fleet",
  );
  const { error } = await supabase.rpc("create_provider_vehicle", {
    p_data: {
      label: String(form.get("label") || ""),
      vehicle_type: String(form.get("vehicle_type") || ""),
      make: String(form.get("make") || ""),
      model: String(form.get("model") || ""),
      model_year: String(form.get("model_year") || ""),
      plate_metadata: String(form.get("plate_metadata") || ""),
      capacity_class: String(form.get("capacity_class") || ""),
      cargo_dimensions: String(form.get("cargo_dimensions") || ""),
      weight_capability: String(form.get("weight_capability") || ""),
      lift_gate: form.get("lift_gate") === "on",
      ramp: form.get("ramp") === "on",
      enclosed: form.get("enclosed") === "on",
      service_categories: form.getAll("service_categories").map(String),
      internal_notes: String(form.get("internal_notes") || ""),
    },
  });
  if (error)
    redirect(`/provider/fleet?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/provider/fleet");
  redirect("/provider/fleet?vehicle=1");
}
export async function createCrew(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/fleet",
  );
  const { error } = await supabase.rpc("create_provider_crew", {
    p_name: String(form.get("name") || ""),
    p_size: Number(form.get("crew_size") || 1),
    p_capabilities: csv(form.get("capabilities")),
    p_heavy: form.get("heavy") === "on",
    p_moving: form.get("moving") === "on",
    p_removal: form.get("removal") === "on",
  });
  if (error)
    redirect(`/provider/fleet?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/provider/fleet");
  redirect("/provider/fleet?crew=1");
}
export async function updateVehicle(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/fleet",
  );
  const { error } = await supabase.rpc("update_provider_vehicle", {
    p_vehicle: String(form.get("vehicle") || ""),
    p_data: {
      label: String(form.get("label") || ""),
      vehicle_type: String(form.get("vehicle_type") || ""),
      make: String(form.get("make") || ""),
      model: String(form.get("model") || ""),
      model_year: String(form.get("model_year") || ""),
      plate_metadata: String(form.get("plate_metadata") || ""),
      capacity_class: String(form.get("capacity_class") || ""),
      cargo_dimensions: String(form.get("cargo_dimensions") || ""),
      weight_capability: String(form.get("weight_capability") || ""),
      lift_gate: form.get("lift_gate") === "on",
      ramp: form.get("ramp") === "on",
      enclosed: form.get("enclosed") === "on",
      active: form.get("active") === "on",
      service_categories: form.getAll("service_categories").map(String),
      internal_notes: String(form.get("internal_notes") || ""),
    },
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/provider/fleet?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/provider/fleet");
  redirect("/provider/fleet?vehicle=updated");
}
export async function updateCrew(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/fleet",
  );
  const { error } = await supabase.rpc("update_provider_crew", {
    p_crew: String(form.get("crew") || ""),
    p_data: {
      name: String(form.get("name") || ""),
      crew_size: Number(form.get("crew_size") || 1),
      capabilities: csv(form.get("capabilities")),
      heavy: form.get("heavy") === "on",
      moving: form.get("moving") === "on",
      removal: form.get("removal") === "on",
      active: form.get("active") === "on",
    },
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/provider/fleet?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/provider/fleet");
  redirect("/provider/fleet?crew=updated");
}
export async function inviteCrewMember(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/fleet",
  );
  const token = randomBytes(32).toString("hex");
  const { data, error } = await supabase.rpc("create_secure_crew_invitation", {
    p_crew: String(form.get("crew") || ""),
    p_email: String(form.get("email") || ""),
    p_role: String(form.get("role") || "crew_member"),
    p_token_hash: createHash("sha256").update(token).digest("hex"),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/provider/fleet?error=${encodeURIComponent(error.message)}`);
  const jar = await cookies();
  jar.set("muber_invitation_handoff", JSON.stringify({ id: data, token }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/provider/fleet",
    maxAge: 600,
  });
  revalidatePath("/provider/fleet");
  redirect("/provider/fleet?invited=1");
}
export async function revokeCrewInvitation(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/fleet",
  );
  const { error } = await supabase.rpc("revoke_crew_invitation", {
    p_invitation: String(form.get("invitation") || ""),
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/provider/fleet?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/provider/fleet");
  redirect("/provider/fleet?revoked=1");
}
