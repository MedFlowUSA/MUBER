import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const destinations: Record<string, string> = {
  customer: "/customer",
  provider_owner: "/provider/dashboard",
  provider_manager: "/provider/dashboard",
  crew_lead: "/crew",
  crew_member: "/crew",
  dispatcher: "/dispatch",
  compliance_admin: "/admin",
  finance_admin: "/admin",
  super_admin: "/admin",
};

export default async function PortalRouter() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/portal");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  redirect(destinations[profile?.role || "customer"] || "/customer");
}
