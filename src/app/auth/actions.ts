"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
function safeNext(value: FormDataEntryValue | null) {
  const path = typeof value === "string" && value ? value : "/portal";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/portal";
}
export async function login(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error)
    redirect(
      `/auth/login?error=${encodeURIComponent("Email or password was not accepted")}`,
    );
  redirect(safeNext(form.get("next")));
}
export async function register(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const full_name = String(form.get("name") ?? "").trim();
  if (password.length < 8)
    redirect(
      "/auth/register?error=Password%20must%20be%20at%20least%208%20characters",
    );
  const origin =
    (await headers()).get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}`,
    },
  });
  if (error)
    redirect(
      `/auth/register?error=${encodeURIComponent("Account could not be created")}`,
    );
  if (!data.session) redirect("/auth/verify");
  redirect(safeNext(form.get("next")));
}
export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
export async function forgot(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(form.get("email") ?? "");
  const origin =
    (await headers()).get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset`,
  });
  redirect("/auth/forgot?sent=1");
}
export async function resetPassword(form: FormData) {
  const password = String(form.get("password") ?? "");
  if (password.length < 8)
    redirect(
      "/auth/reset?error=Password%20must%20be%20at%20least%208%20characters",
    );
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/auth/reset?error=Unable%20to%20update%20password");
  redirect("/portal");
}
