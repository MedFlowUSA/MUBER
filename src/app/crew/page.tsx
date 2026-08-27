import { EmptyState } from "@/components/empty-state";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
export default async function Page() {
  await requireOperationalRole(
    ["crew_lead", "crew_member", "super_admin"],
    "/crew",
  );
  return (
    <RoleShell role="crew">
      <p className="eyebrow">Crew workspace</p>
      <h1 className="mt-2 mb-8 text-4xl font-black">Assigned field work</h1>
      <EmptyState
        title="No crew assignments"
        copy="Only jobs assigned to your crew will appear here. Customer details remain hidden until a valid assignment exists."
      />
    </RoleShell>
  );
}
