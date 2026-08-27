import { EmptyState } from "@/components/empty-state";
import { RoleShell } from "@/components/role-shell";
export default function Page() {
  return (
    <RoleShell role="dispatch">
      <p className="eyebrow">Dispatch workspace</p>
      <h1 className="mt-2 mb-8 text-4xl font-black">Jobs in motion</h1>
      <EmptyState
        title="Dispatch queue is empty"
        copy="The future queue will coordinate reviewed requests, qualified provider options, assignments, exceptions, and service recovery. Matching is not automated in Phase 1."
      />
    </RoleShell>
  );
}
