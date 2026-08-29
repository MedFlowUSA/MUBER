import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { ASSIGNMENT_STATUSES, parseProviderWorkQuery } from "@/lib/queue-query";
import { scheduleAssignment } from "./actions";
type AssignmentCard = {
  id: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  crew_id: string | null;
  vehicle_id: string | null;
  jobs: {
    service: string;
    description: string;
    preferred_start: string | null;
  } | null;
};
export default async function ProviderJobs({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    scheduled?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/jobs",
  );
  const query = await searchParams;
  const filters = parseProviderWorkQuery(query, "assignment");
  let assignmentQuery = supabase
    .from("assignments")
    .select(
      "id,status,scheduled_start,scheduled_end,crew_id,vehicle_id,jobs(service,description,preferred_start)",
      { count: "exact" },
    );
  if (filters.status)
    assignmentQuery = assignmentQuery.eq("status", filters.status);
  const start = (filters.page - 1) * filters.pageSize;
  const [{ data: assignments, count }, { data: vehicles }, { data: crews }] =
    await Promise.all([
      assignmentQuery
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + filters.pageSize - 1),
      supabase
        .from("vehicles")
        .select("id,label,vehicle_type")
        .eq("active", true)
        .eq("insurance_eligible", true),
      supabase.from("crews").select("id,name,crew_size").eq("active", true),
    ]);
  const pages = Math.max(1, Math.ceil((count || 0) / filters.pageSize));
  const href = (page: number) =>
    `/provider/jobs?status=${encodeURIComponent(filters.status)}&page=${page}`;
  return (
    <RoleShell role="provider">
      <Link
        href="/provider/dashboard"
        className="text-sm font-bold text-orange-600"
      >
        ← Provider dashboard
      </Link>
      <p className="eyebrow mt-6">Accepted work</p>
      <h1 className="mt-2 text-4xl font-black">Schedule assignments</h1>
      <p className="mt-3 text-slate">
        Choose an active, capable crew and vehicle. The server enforces job
        requirements and schedule conflicts.
      </p>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {query.scheduled && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Assignment schedule saved and audited.
        </p>
      )}
      <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_auto]">
        <select
          name="status"
          defaultValue={filters.status}
          className="rounded-xl border p-3"
        >
          <option value="">All statuses</option>
          {ASSIGNMENT_STATUSES.map((status) => (
            <option key={status}>{status.replaceAll("_", " ")}</option>
          ))}
        </select>
        <button className="btn-primary">Apply filter</button>
      </form>
      <div className="mt-8 grid gap-5">
        {((assignments || []) as unknown as AssignmentCard[]).map((a) => (
          <article key={a.id} className="rounded-2xl border bg-white p-6">
            <p className="text-xs font-black uppercase text-orange">
              {a.jobs?.service} · {a.status.replaceAll("_", " ")}
            </p>
            <h2 className="mt-1 text-xl font-black">
              {a.jobs?.description || "Assigned job"}
            </h2>
            {a.scheduled_start && (
              <p className="mt-4 rounded-xl bg-warm p-3 font-bold">
                Scheduled {new Date(a.scheduled_start).toLocaleString()}–
                {a.scheduled_end
                  ? new Date(a.scheduled_end).toLocaleString()
                  : "end pending"}
              </p>
            )}
            {["accepted", "crew_assigned"].includes(a.status) && (
              <form
                action={scheduleAssignment}
                className="mt-5 grid gap-3 md:grid-cols-2"
              >
                <input type="hidden" name="assignment" value={a.id} />
                <select
                  name="vehicle"
                  required
                  defaultValue={a.vehicle_id || ""}
                  className="rounded-xl border px-3 py-3"
                >
                  <option value="">Select vehicle</option>
                  {(vehicles || []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} · {v.vehicle_type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  name="crew"
                  required
                  defaultValue={a.crew_id || ""}
                  className="rounded-xl border px-3 py-3"
                >
                  <option value="">Select crew</option>
                  {(crews || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.crew_size} people
                    </option>
                  ))}
                </select>
                <label className="text-sm font-bold">
                  Arrival starts
                  <input
                    name="start"
                    type="datetime-local"
                    required
                    className="mt-1 block w-full rounded-xl border px-3 py-3 font-normal"
                  />
                </label>
                <label className="text-sm font-bold">
                  Arrival ends
                  <input
                    name="end"
                    type="datetime-local"
                    required
                    className="mt-1 block w-full rounded-xl border px-3 py-3 font-normal"
                  />
                </label>
                <button className="rounded-xl bg-navy px-5 py-3 font-bold text-white md:col-span-2">
                  Save assignment schedule
                </button>
              </form>
            )}
          </article>
        ))}
        {!assignments?.length && (
          <p className="rounded-2xl border bg-white p-8 text-slate">
            No accepted assignments yet.
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
