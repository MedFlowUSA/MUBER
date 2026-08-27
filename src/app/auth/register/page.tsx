import { AuthForm } from "@/components/auth-form";
import { register } from "../actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthForm
      title="Create your account"
      copy="Your account begins securely with the customer role."
      action={register}
      kind="register"
      error={p.error}
      next={p.next}
    />
  );
}
