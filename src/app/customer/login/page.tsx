import { AuthForm } from "@/components/auth-form";
import { login } from "@/app/auth/actions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      title="Customer sign in"
      copy="Access your requests, quotes, appointments, and job history."
      action={login}
      kind="login"
      error={params.error}
      next={params.next || "/customer"}
      eyebrow="Customer portal"
      authPath="/customer/login"
      registerHref="/customer/register"
    />
  );
}
