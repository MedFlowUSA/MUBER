"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markRead(form: FormData) {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("mark_notification_read", {
    p_notification: String(form.get("notification") || ""),
  });
  revalidatePath("/notifications");
}
