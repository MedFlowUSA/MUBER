"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function acceptInvitation(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const invitation = String(form.get("invitation") || "");
  const token = String(form.get("token") || "");
  const { error } = await supabase.rpc("accept_crew_invitation", {
    p_invitation: invitation,
    p_token: token,
    p_request_id: crypto.randomUUID(),
  });
  if (error)
    redirect(
      `/crew/invite/${invitation}?token=${encodeURIComponent(token)}&error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/crew");
  revalidatePath("/provider/fleet");
  redirect("/crew?activated=1");
}
