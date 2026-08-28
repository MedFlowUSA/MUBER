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
      title="Contractor sign in"
      copy="Access your provider application or approved company workspace."
      action={login}
      kind="login"
      error={params.error}
      next={params.next || "/contractor"}
      eyebrow="Contractor portal"
      authPath="/contractor/login"
      registerHref="/contractor/register"
    />
  );
}
