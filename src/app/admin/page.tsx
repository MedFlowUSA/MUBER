import { EmptyState } from "@/components/empty-state";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import Link from "next/link";
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
      {(profile.role === "compliance_admin" ||
        profile.role === "super_admin") && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/providers"
            className="inline-flex rounded-xl bg-orange-600 px-5 py-3 font-bold text-white"
          >
            Review contractor applications
          </Link>
          <Link
            href="/admin/credentials"
            className="inline-flex rounded-xl border border-orange-600 px-5 py-3 font-bold text-orange-700"
          >
            Review credentials
          </Link>
          <Link
            href="/admin/support"
            className="inline-flex rounded-xl border border-navy px-5 py-3 font-bold text-navy"
          >
            Review support requests
          </Link>
          <Link
            href="/dispatch/incidents"
            className="inline-flex rounded-xl border border-red-500 px-5 py-3 font-bold text-red-700"
          >
            Review incidents
          </Link>
        </div>
      )}
    </RoleShell>
  );
}
