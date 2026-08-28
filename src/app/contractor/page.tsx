import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ContractorRouter() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/contractor/login?next=/contractor");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (["provider_owner", "provider_manager"].includes(profile?.role || ""))
    redirect("/provider/dashboard");
  redirect("/provider/apply");
}
