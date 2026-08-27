import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";

type AuditRow = {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  occurred_at: string;
};

export default async function AuditFeed() {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/audit",
  );
  const { data: events, error } = await supabase.rpc("get_admin_audit_feed", {
    p_limit: 150,
  });
  return (
    <RoleShell role="admin">
      <Link href="/admin" className="text-sm font-bold text-orange-600">
        ← Admin portal
      </Link>
      <p className="eyebrow mt-6">Immutable history</p>
      <h1 className="mt-2 text-4xl font-black">Audit activity</h1>
      <p className="mt-3 text-slate">
        This view intentionally excludes raw metadata, secrets, tokens,
        addresses, and documents.
      </p>
      {error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          Audit activity could not be loaded.
        </p>
      )}
      <div className="mt-8 overflow-hidden rounded-2xl border bg-white">
        <div className="hidden grid-cols-[1.2fr_1fr_1fr_auto] gap-4 border-b bg-warm p-4 text-xs font-black uppercase md:grid">
          <span>Action</span>
          <span>Actor</span>
          <span>Target</span>
          <span>Time</span>
        </div>
        {((events || []) as AuditRow[]).map((event) => (
          <article
            key={event.id}
            className="grid gap-2 border-b p-4 last:border-0 md:grid-cols-[1.2fr_1fr_1fr_auto] md:gap-4"
          >
            <strong>{event.action.replaceAll("_", " ")}</strong>
            <span>{event.actor_name}</span>
            <span className="text-sm text-slate">{event.entity_type}</span>
            <time className="text-xs text-slate">
              {new Date(event.occurred_at).toLocaleString()}
            </time>
          </article>
        ))}
        {!events?.length && !error && (
          <p className="p-8 text-slate">
            No authorized audit events are available.
          </p>
        )}
      </div>
    </RoleShell>
  );
}
