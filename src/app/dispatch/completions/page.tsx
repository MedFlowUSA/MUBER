/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import {
  COMPLETION_STATUSES,
  parseComplianceQueueQuery,
} from "@/lib/queue-query";
import { reviewCompletion } from "./actions";
export default async function CompletionQueue({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    updated?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch/completions",
  );
  const query = await searchParams;
  const filters = parseComplianceQueueQuery(query, "completion");
  let completionQuery = supabase
    .from("completion_submissions")
    .select(
      "id,status,completion_at,work_summary,items_summary,customer_summary,damage_declared,incident_declared,missing_item_declared,access_issue_declared,additional_scope_declared,disposal_receipt_status,customer_confirmation_status,jobs(reference,service,preferred_start),provider_companies(legal_name),crews(name),completion_media(id,purpose,customer_visible,mime_type)",
      { count: "exact" },
    );
  if (filters.status)
    completionQuery = completionQuery.eq("status", filters.status);
  const start = (filters.page - 1) * filters.pageSize;
  const { data: rows, count } = await completionQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + filters.pageSize - 1);
  const pages = Math.max(1, Math.ceil((count || 0) / filters.pageSize));
  const href = (page: number) => {
    const p = new URLSearchParams();
    if (filters.status) p.set("status", filters.status);
    p.set("page", String(page));
    return `/dispatch/completions?${p}`;
  };
  return (
    <RoleShell role="dispatch">
      <Link href="/dispatch" className="text-sm font-bold text-orange-600">
        ← Dispatch dashboard
      </Link>
      <p className="eyebrow mt-6">Operational review</p>
      <h1 className="mt-2 text-4xl font-black">Completion queue</h1>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {query.updated && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Review action recorded and audited.
        </p>
      )}
      <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_auto]">
        <select
          name="status"
          defaultValue={filters.status}
          className="rounded-xl border p-3"
        >
          <option value="">All statuses</option>
          {COMPLETION_STATUSES.map((status) => (
            <option key={status}>{status.replaceAll("_", " ")}</option>
          ))}
        </select>
        <button className="btn-primary">Apply filter</button>
      </form>
      <div className="mt-8 grid gap-5">
        {(rows || []).map((s: any) => (
          <article key={s.id} className="rounded-2xl border bg-white p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs font-black text-orange">
                  {s.jobs?.reference} · {s.jobs?.service}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {s.provider_companies?.legal_name} · {s.crews?.name}
                </h2>
              </div>
              <span className="font-bold uppercase">
                {s.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-4">
              <strong>Work:</strong> {s.work_summary}
            </p>
            <p className="mt-2">
              <strong>Items:</strong> {s.items_summary}
            </p>
            <p className="mt-2 rounded-xl bg-warm p-3">
              <strong>Customer summary:</strong> {s.customer_summary}
            </p>
            <p className="mt-3 text-sm font-bold text-red-700">
              Flags:{" "}
              {[
                s.damage_declared && "damage",
                s.incident_declared && "incident",
                s.missing_item_declared && "missing item",
                s.access_issue_declared && "access",
                s.additional_scope_declared && "additional scope",
              ]
                .filter(Boolean)
                .join(", ") || "none declared"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(s.completion_media || []).map((media: any) => (
                <a
                  key={media.id}
                  href={`/api/completion-media/${media.id}`}
                  target="_blank"
                  className="rounded-xl border px-3 py-2 text-sm font-bold"
                  rel="noreferrer"
                >
                  View {media.purpose.replaceAll("_", " ")}
                </a>
              ))}
              {!s.completion_media?.length && (
                <p className="text-sm text-red-700">
                  No evidence files attached.
                </p>
              )}
            </div>
            {["pending_review", "under_review"].includes(s.status) && (
              <div className="mt-5 grid gap-3">
                <form action={reviewCompletion}>
                  <input type="hidden" name="submission" value={s.id} />
                  <button
                    name="action"
                    value="begin_review"
                    className="rounded-xl border px-4 py-3 font-bold"
                  >
                    Begin review
                  </button>
                </form>
                <form
                  action={reviewCompletion}
                  className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"
                >
                  <input type="hidden" name="submission" value={s.id} />
                  <input
                    name="reason"
                    minLength={10}
                    placeholder="Internal reason for return or incident"
                    className="rounded-xl border p-3"
                  />
                  <button
                    name="action"
                    value="request_information"
                    className="rounded-xl border px-4 py-3 font-bold"
                  >
                    Request information
                  </button>
                  <button
                    name="action"
                    value="incident_hold"
                    className="rounded-xl border border-red-300 px-4 py-3 font-bold text-red-700"
                  >
                    Incident hold
                  </button>
                </form>
                <form
                  action={reviewCompletion}
                  className="grid gap-2 sm:grid-cols-[1fr_auto]"
                >
                  <input type="hidden" name="submission" value={s.id} />
                  <input
                    name="customer_message"
                    required
                    minLength={10}
                    placeholder="Customer-visible completion message"
                    className="rounded-xl border p-3"
                  />
                  <button
                    name="action"
                    value="approve"
                    className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white"
                  >
                    Approve completion
                  </button>
                </form>
              </div>
            )}
          </article>
        ))}
        {!rows?.length && (
          <p className="rounded-2xl border bg-white p-8 text-slate">
            No completion submissions.
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
          Page {filters.page} of {pages} · {count || 0}
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
