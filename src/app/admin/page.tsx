import { EmptyState } from "@/components/empty-state";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
export default async function Page() {
  const { profile } = await requireOperationalRole(
    ["compliance_admin", "finance_admin", "super_admin"],
    "/admin",
  );
  return (
    <RoleShell role="admin">
      <p className="eyebrow">Controlled administration</p>
      <h1 className="mt-2 mb-8 text-4xl font-black">
        {profile.role === "compliance_admin"
          ? "Provider compliance"
          : profile.role === "finance_admin"
            ? "Finance foundation"
            : "Marketplace administration"}
      </h1>
      <EmptyState
        title="No actions require review"
        copy="This role sees only its permitted administrative domain. Role assignment and sensitive decisions require server-side authorization and audit logging."
      />
    </RoleShell>
  );
}
