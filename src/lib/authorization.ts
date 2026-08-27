import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type OperationalRole =
  | "provider_owner"
  | "provider_manager"
  | "crew_lead"
  | "crew_member"
  | "dispatcher"
  | "compliance_admin"
  | "finance_admin"
  | "super_admin";
export async function requireOperationalRole(
  allowed: OperationalRole[],
  returnTo: string,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(returnTo)}`);
  const { data } = await supabase
    .from("profiles")
    .select("id,role,full_name")
    .eq("id", user.id)
    .single();
  if (!data || !allowed.includes(data.role as OperationalRole)) notFound();
  return { supabase, user, profile: data };
}
