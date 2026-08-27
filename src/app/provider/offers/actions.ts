"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";
export async function respondToOffer(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/offers",
  );
  const offer = String(form.get("offer") || ""),
    response = String(form.get("response") || ""),
    reason = String(form.get("decline_reason") || "");
  const { error } = await supabase.rpc("respond_to_provider_offer", {
    p_offer: offer,
    p_response: response,
    p_decline_reason: reason || null,
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(`/provider/offers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/provider/dashboard");
  revalidatePath("/provider/offers");
  redirect(
    `/provider/offers?${response === "accept" ? "accepted" : "declined"}=1`,
  );
}
