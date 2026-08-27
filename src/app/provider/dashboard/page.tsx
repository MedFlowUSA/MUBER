import { EmptyState } from "@/components/empty-state";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import Link from "next/link";
export default async function Page() {
  await requireOperationalRole(
    ["provider_owner", "provider_manager", "super_admin"],
    "/provider/dashboard",
  );
  return (
    <RoleShell role="provider">
      <p className="eyebrow">Provider company portal</p>
      <h1 className="mt-2 mb-8 text-4xl font-black">Company readiness</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <EmptyState
          title="No pending offers"
          copy="Only offers for your provider company will appear here. Exact customer locations remain hidden until acceptance."
        />
        <EmptyState
          title="Complete company setup"
          copy="Credentials, vehicles, crews, service territory, and availability determine manual dispatch eligibility."
        />
      </div>
      <Link
        href="/provider/credentials"
        className="mt-6 inline-flex rounded-xl bg-orange-600 px-5 py-3 font-bold text-white"
      >
        Manage credentials
      </Link>
      <Link
        href="/provider/fleet"
        className="mt-6 ml-3 inline-flex rounded-xl border border-orange-600 px-5 py-3 font-bold text-orange-700"
      >
        Manage vehicles and crews
      </Link>
    </RoleShell>
  );
}
