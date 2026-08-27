import { AuthForm } from "@/components/auth-form";
import { resetPassword } from "../actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthForm
      title="Choose a new password"
      copy="Use at least eight characters."
      action={resetPassword}
      kind="reset"
      error={p.error}
    />
  );
}
