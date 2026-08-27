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
      copy="Sign in to submit requests and view your jobs."
      action={login}
      kind="login"
      error={p.error}
      next={p.next}
    />
  );
}
