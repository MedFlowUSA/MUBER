import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";

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

export default async function DispatchPage() {
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    "/dispatch",
  );
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id,reference,service,status,preferred_start,time_window,description,created_at,customers(full_name,email),internal_job_reviews(complexity,risk_flags)",
    )
    .order("created_at", { ascending: false });
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
      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {queueGroups.map((queue) => (
          <div key={queue.label} className="rounded-2xl border bg-white p-5">
            <p className="text-sm font-bold text-slate">{queue.label}</p>
            <p className="mt-2 text-4xl font-black">
              {
                (jobs || []).filter((job) =>
                  queue.statuses.includes(job.status),
                ).length
              }
            </p>
          </div>
        ))}
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-black">All active requests</h2>
        <div className="mt-4 grid gap-3">
          {(jobs || [])
            .filter(
              (job) =>
                !["closed", "completed", "cancelled"].includes(job.status),
            )
            .map((job) => (
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
      </section>
    </RoleShell>
  );
}
