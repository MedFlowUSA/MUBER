import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";

type Overview = {
  role: string;
  submitted_applications?: number;
  credentials_needing_review?: number;
  open_support_requests?: number;
  open_incidents?: number;
  high_risk_incidents?: number;
  active_contractors?: number;
  payments_enabled: boolean;
  message?: string;
};

export default async function AdminPortal() {
  const { supabase, profile } = await requireOperationalRole(
    ["compliance_admin", "finance_admin", "super_admin"],
    "/admin",
  );
  const { data } = await supabase.rpc("get_admin_overview");
  const overview = (data || {
    role: profile.role,
    payments_enabled: false,
  }) as Overview;
  const compliance =
    profile.role === "compliance_admin" || profile.role === "super_admin";
  const cards = [
    ["Applications", overview.submitted_applications || 0, "/admin/providers"],
    [
      "Credentials",
      overview.credentials_needing_review || 0,
      "/admin/credentials",
    ],
    ["Support requests", overview.open_support_requests || 0, "/admin/support"],
    ["Open incidents", overview.open_incidents || 0, "/dispatch/incidents"],
    [
      "High-risk incidents",
      overview.high_risk_incidents || 0,
      "/dispatch/incidents",
    ],
    [
      "Active contractors",
      overview.active_contractors || 0,
      "/admin/providers",
    ],
  ] as const;
  return (
    <RoleShell role="admin">
      <p className="eyebrow">Controlled administration</p>
      <h1 className="mt-2 text-4xl font-black">
        {profile.role === "compliance_admin"
          ? "Compliance administration"
          : profile.role === "finance_admin"
            ? "Finance administration"
            : "Marketplace administration"}
      </h1>
      <p className="mt-3 text-slate">
        Signed in as {profile.full_name || "administrator"}. Access is limited
        to the assigned administrative domain.
      </p>
      {profile.role === "finance_admin" ? (
        <section className="card mt-8">
          <h2 className="text-2xl font-black">
            Financial systems are not active
          </h2>
          <p className="mt-3 text-slate">
            Stripe, payouts, refunds, reconciliation, and money movement are
            intentionally unavailable. This role does not receive contractor
            compliance or dispatch access.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(([label, value, href]) => (
              <Link
                href={href}
                key={label}
                className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5"
              >
                <p className="text-sm font-bold text-slate">{label}</p>
                <p className="mt-2 text-4xl font-black">{value}</p>
              </Link>
            ))}
          </section>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/providers" className="btn-primary">
              Review contractors
            </Link>
            <Link href="/admin/credentials" className="btn-ghost">
              Review credentials
            </Link>
            <Link href="/admin/support" className="btn-ghost">
              Review support
            </Link>
            <Link href="/dispatch/incidents" className="btn-ghost">
              Review incidents
            </Link>
            {compliance && (
              <Link href="/admin/audit" className="btn-ghost">
                Audit activity
              </Link>
            )}
          </div>
          <p className="mt-6 text-sm font-bold text-slate">
            Payments enabled: {overview.payments_enabled ? "Yes" : "No"}
          </p>
        </>
      )}
    </RoleShell>
  );
}
