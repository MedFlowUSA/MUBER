import { AuthForm } from "@/components/auth-form";
import { login } from "@/app/auth/actions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      title="MUBER staff sign in"
      copy="Restricted to authorized MUBER personnel. Staff accounts are provisioned through a controlled administrative process."
      action={login}
      kind="login"
      error={params.error}
      next="/portal"
      eyebrow="Staff portal"
      authPath="/admin/login"
      allowRegistration={false}
    />
  );
}
