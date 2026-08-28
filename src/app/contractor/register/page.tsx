import { AuthForm } from "@/components/auth-form";
import { register } from "@/app/auth/actions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      title="Start a contractor application"
      copy="Create an account, then submit your company for review. Registration does not grant contractor access."
      action={register}
      kind="register"
      error={params.error}
      next="/provider/apply"
      eyebrow="Contractor registration"
      authPath="/contractor/register"
      loginHref="/contractor/login"
    />
  );
}
