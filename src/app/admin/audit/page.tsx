import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { parseAuditQueueQuery } from "@/lib/queue-query";

type AuditRow = {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  occurred_at: string;
  total_count: number;
};

export default async function AuditFeed({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; page?: string }>;
}) {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/audit",
  );
  const filters = parseAuditQueueQuery(await searchParams);
  const { data: events, error } = await supabase.rpc(
    "get_admin_audit_feed_page",
    {
      p_action_prefix: filters.action,
      p_entity_type: filters.entity,
      p_limit: filters.pageSize,
      p_offset: (filters.page - 1) * filters.pageSize,
    },
  );
  const count = Number((events?.[0] as AuditRow | undefined)?.total_count || 0),
    pages = Math.max(1, Math.ceil(count / filters.pageSize));
  const href = (page: number) => {
    const p = new URLSearchParams();
    if (filters.action) p.set("action", filters.action);
    if (filters.entity) p.set("entity", filters.entity);
    p.set("page", String(page));
    return `/admin/audit?${p}`;
  };
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
      <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
        <input
          name="action"
          defaultValue={filters.action}
          maxLength={60}
          placeholder="Action prefix, e.g. provider."
          className="rounded-xl border p-3"
        />
        <input
          name="entity"
          defaultValue={filters.entity}
          maxLength={60}
          placeholder="Exact entity type"
          className="rounded-xl border p-3"
        />
        <button className="btn-primary">Apply filters</button>
      </form>
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
      <div className="mt-5 flex items-center justify-between">
        <Link
          href={href(Math.max(1, filters.page - 1))}
          className={`btn-ghost ${filters.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
        >
          Previous
        </Link>
        <span className="text-sm font-bold">
          Page {filters.page} of {pages} · {count}
        </span>
        <Link
          href={href(Math.min(pages, filters.page + 1))}
          className={`btn-ghost ${filters.page >= pages ? "pointer-events-none opacity-50" : ""}`}
        >
          Next
        </Link>
      </div>
    </RoleShell>
  );
}
