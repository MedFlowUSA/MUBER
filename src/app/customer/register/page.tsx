import { AuthForm } from "@/components/auth-form";
import { register } from "@/app/auth/actions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      title="Create a customer account"
      copy="Request service and manage every step from one protected account."
      action={register}
      kind="register"
      error={params.error}
      next={params.next || "/customer"}
      eyebrow="Customer registration"
      authPath="/customer/register"
      loginHref="/customer/login"
    />
  );
}
