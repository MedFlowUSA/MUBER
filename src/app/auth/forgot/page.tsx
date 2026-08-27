import { AuthForm } from "@/components/auth-form";
import { forgot } from "../actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthForm
      title="Reset your password"
      copy="Enter your email and we’ll send a secure reset link."
      action={forgot}
      kind="forgot"
      sent={p.sent === "1"}
    />
  );
}
