import { EmptyState } from "@/components/empty-state";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
export default async function Page() {
  await requireOperationalRole(["dispatcher", "super_admin"], "/dispatch");
  return (
    <RoleShell role="dispatch">
      <p className="eyebrow">Dispatch workspace</p>
      <h1 className="mt-2 mb-8 text-4xl font-black">
        Operational review queue
      </h1>
      <EmptyState
        title="No reviewed jobs in this queue"
        copy="New requests, information requests, quote preparation, provider offers, assignments, and attention flags will appear here through server-authorized commands."
      />
    </RoleShell>
  );
}
