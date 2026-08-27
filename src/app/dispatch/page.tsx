import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { DISPATCH_STATUSES, parseQueueQuery } from "@/lib/queue-query";

const queueGroups = [
  { label: "New", statuses: ["submitted"] },
  { label: "Needs information", statuses: ["needs_customer_information"] },
  {
    label: "Quotes in progress",
    statuses: ["needs_review", "quote_preparation"],
  },
  { label: "Offers awaiting action", statuses: ["offer_sent"] },
  {
    label: "Unassigned",
    statuses: ["quote_accepted", "ready_for_matching", "reassignment_required"],
  },
  { label: "Assigned", statuses: ["assigned", "crew_confirmed", "ready"] },
  {
    label: "Active field work",
    statuses: ["en_route", "arrived", "in_progress"],
  },
  { label: "Completion review", statuses: ["completion_review"] },
  { label: "Needs attention", statuses: ["incident_hold"] },
];
const first = <T,>(value: T | T[] | null) =>
  Array.isArray(value) ? value[0] : value;

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const query = parseQueueQuery(await searchParams);
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch",
  );
  let jobsQuery = supabase
    .from("jobs")
    .select(
      "id,reference,service,status,preferred_start,time_window,description,created_at,customers(full_name,email),internal_job_reviews(complexity,risk_flags)",
      { count: "exact" },
    )
    .in("status", [...DISPATCH_STATUSES]);
  if (query.status) jobsQuery = jobsQuery.eq("status", query.status);
  if (query.q) jobsQuery = jobsQuery.ilike("reference", `${query.q}%`);
  const start = (query.page - 1) * query.pageSize;
  const [{ data: jobs, error, count }, { data: queueCounts }] =
    await Promise.all([
      jobsQuery
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + query.pageSize - 1),
      supabase.rpc("dispatch_queue_counts"),
    ]);
  const totalPages = Math.max(1, Math.ceil((count || 0) / query.pageSize));
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.status) params.set("status", query.status);
    params.set("page", String(page));
    return `/dispatch?${params}`;
  };
  return (
    <RoleShell role="dispatch">
      <p className="eyebrow">Dispatch workspace</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">Operational review queue</h1>
          <p className="mt-3 text-slate">
            Live customer requests organized by their server-authoritative
            state.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dispatch/incidents" className="btn-ghost">
            Incidents and closure
          </Link>
          <Link href="/dispatch/completions" className="btn-primary">
            Review completions
          </Link>
          <Link href="/dispatch" className="btn-ghost">
            Refresh queues
          </Link>
        </div>
      </div>
      {error && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">
          The dispatch queue could not be loaded.
        </p>
      )}
      <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="font-bold">
          Reference search
          <input
            name="q"
            defaultValue={query.q}
            maxLength={40}
            pattern="[A-Za-z0-9-]*"
            placeholder="MUB-2608-"
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="font-bold">
          Job state
          <select
            name="status"
            defaultValue={query.status}
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          >
            <option value="">All active states</option>
            {DISPATCH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary self-end">Apply filters</button>
      </form>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {queueGroups.map((queue) => (
          <div key={queue.label} className="rounded-2xl border bg-white p-5">
            <p className="text-sm font-bold text-slate">{queue.label}</p>
            <p className="mt-2 text-4xl font-black">
              {Number(
                (queueCounts as Record<string, number> | null)?.[
                  queue.label.toLowerCase().replaceAll(" ", "_")
                ] || 0,
              )}
            </p>
          </div>
        ))}
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-black">All active requests</h2>
        <div className="mt-4 grid gap-3">
          {(jobs || []).map((job) => (
            <Link
              key={job.id}
              href={`/dispatch/jobs/${job.id}`}
              className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-orange">
                    {job.reference}
                  </p>
                  <h3 className="mt-1 text-lg font-black">
                    {job.service === "move" ? "Move It" : "Remove It"} ·{" "}
                    {first(job.customers)?.full_name || "Customer"}
                  </h3>
                </div>
                <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold uppercase">
                  {job.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate">
                {job.description || "No additional description"}
              </p>
              <p className="mt-3 text-xs font-bold text-slate">
                Requested{" "}
                {job.preferred_start
                  ? new Date(job.preferred_start).toLocaleDateString()
                  : "date pending"}{" "}
                · {job.time_window || "Flexible"}
              </p>
            </Link>
          ))}
          {!jobs?.length && (
            <p className="rounded-2xl border bg-white p-8 text-slate">
              No customer requests are in the queue.
            </p>
          )}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Link
            href={pageHref(Math.max(1, query.page - 1))}
            aria-disabled={query.page <= 1}
            className={`btn-ghost ${query.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <p className="text-sm font-bold">
            Page {query.page} of {totalPages} · {count || 0} results
          </p>
          <Link
            href={pageHref(Math.min(totalPages, query.page + 1))}
            aria-disabled={query.page >= totalPages}
            className={`btn-ghost ${query.page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      </section>
    </RoleShell>
  );
}
