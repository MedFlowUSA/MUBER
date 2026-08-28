"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
function safeNext(value: FormDataEntryValue | null) {
  const path = typeof value === "string" && value ? value : "/portal";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/portal";
}
const authPaths = new Set([
  "/auth/login",
  "/auth/register",
  "/customer/login",
  "/customer/register",
  "/contractor/login",
  "/contractor/register",
  "/admin/login",
]);
function safeAuthPath(value: FormDataEntryValue | null, fallback: string) {
  const path = typeof value === "string" ? value : "";
  return authPaths.has(path) ? path : fallback;
}
export async function login(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const path = safeAuthPath(form.get("authPath"), "/auth/login");
    redirect(
      `${path}?error=${encodeURIComponent("Email or password was not accepted")}&next=${encodeURIComponent(safeNext(form.get("next")))}`,
    );
  }
  redirect(safeNext(form.get("next")));
}
export async function register(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const full_name = String(form.get("name") ?? "").trim();
  const registerPath = safeAuthPath(form.get("authPath"), "/customer/register");
  const registrationNext = safeNext(form.get("next"));
  if (password.length < 8)
    redirect(
      `${registerPath}?error=Password%20must%20be%20at%20least%208%20characters&next=${encodeURIComponent(registrationNext)}`,
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
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(registrationNext)}`,
    },
  });
  if (error)
    redirect(
      `${registerPath}?error=${encodeURIComponent("Account could not be created")}&next=${encodeURIComponent(registrationNext)}`,
    );
  if (!data.session) redirect("/auth/verify");
  redirect(registrationNext);
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
