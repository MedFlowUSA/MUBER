import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthForm
      title="Welcome back"
      copy="Sign in to your Customer, Contractor, Crew, Dispatch, or Admin portal."
      action={login}
      kind="login"
      error={p.error}
      next={p.next}
    />
  );
}
