"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperationalRole } from "@/lib/authorization";

export async function reviewCredential(form: FormData) {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/credentials",
  );
  const credential = String(form.get("credential") || "");
  const decision = String(form.get("decision") || "");
  const reason = String(form.get("reason") || "").trim();
  if (
    !/^[0-9a-f-]{36}$/i.test(credential) ||
    !["under_review", "verified", "rejected", "suspended"].includes(decision)
  )
    redirect("/admin/credentials?error=Invalid%20review%20request");
  if (["rejected", "suspended"].includes(decision) && reason.length < 10)
    redirect("/admin/credentials?error=A%20specific%20reason%20is%20required");
  const { error } = await supabase.rpc("review_provider_credential", {
    p_credential: credential,
    p_decision: decision,
    p_reason: reason || null,
  });
  if (error)
    redirect(`/admin/credentials?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/credentials");
  redirect("/admin/credentials?reviewed=1");
}
