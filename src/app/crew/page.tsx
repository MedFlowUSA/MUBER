import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { crewFieldActions } from "@/lib/job-status";
import { advanceFieldWork, confirmCrewAssignment } from "./actions";
type Stop = {
  stop_order: number;
  stop_type: string;
  addresses: {
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    postal_code: string;
    access_notes: string | null;
  } | null;
};
type CrewAssignment = {
  id: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  crews: { name: string; crew_size: number } | null;
  vehicles: { label: string; vehicle_type: string } | null;
  jobs: {
    service: string;
    description: string;
    customers: { full_name: string; phone: string } | null;
    job_stops: Stop[];
  } | null;
};
export default async function CrewPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    confirmed?: string;
    advanced?: string;
  }>;
}) {
  const { supabase, profile } = await requireOperationalRole(
    ["crew_lead", "crew_member", "super_admin"],
    "/crew",
  );
  const query = await searchParams;
  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "id,status,scheduled_start,scheduled_end,jobs(service,description,customers(full_name,phone),job_stops(stop_order,stop_type,addresses(line1,line2,city,region,postal_code,access_notes))),crews(name,crew_size),vehicles(label,vehicle_type)",
    )
    .order("scheduled_start", { ascending: true });
  return (
    <RoleShell role="crew">
      <p className="eyebrow">Crew workspace</p>
      <h1 className="mt-2 text-4xl font-black">Assigned field work</h1>
      <p className="mt-3 text-slate">
        Only work assigned to your crew appears here. Customer details are
        released only after a valid assignment.
      </p>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {(query.confirmed || query.advanced) && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Field status recorded and the customer timeline updated.
        </p>
      )}
      <div className="mt-8 grid gap-5">
        {((assignments || []) as unknown as CrewAssignment[]).map((a) => (
          <article key={a.id} className="rounded-2xl border bg-white p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-orange">
                  {a.jobs?.service} · {a.status.replaceAll("_", " ")}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {a.jobs?.description || "Assigned job"}
                </h2>
              </div>
              <p className="font-bold">
                {a.scheduled_start
                  ? new Date(a.scheduled_start).toLocaleString()
                  : "Schedule pending"}
              </p>
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate">Crew</dt>
                <dd className="font-bold">
                  {a.crews?.name} · {a.crews?.crew_size} people
                </dd>
              </div>
              <div>
                <dt className="text-slate">Vehicle</dt>
                <dd className="font-bold">
                  {a.vehicles?.label} ·{" "}
                  {a.vehicles?.vehicle_type?.replaceAll("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-slate">Customer</dt>
                <dd className="font-bold">
                  {a.jobs?.customers?.full_name}
                  <br />
                  {a.jobs?.customers?.phone}
                </dd>
              </div>
            </dl>
            <div className="mt-5 grid gap-3">
              {(a.jobs?.job_stops || [])
                .sort((x, y) => x.stop_order - y.stop_order)
                .map((s) => (
                  <div key={s.stop_order} className="rounded-xl bg-warm p-4">
                    <p className="text-xs font-black uppercase text-orange">
                      {s.stop_type}
                    </p>
                    <p className="font-bold">
                      {s.addresses?.line1}
                      {s.addresses?.line2 ? `, ${s.addresses.line2}` : ""},{" "}
                      {s.addresses?.city}, {s.addresses?.region}{" "}
                      {s.addresses?.postal_code}
                    </p>
                    {s.addresses?.access_notes && (
                      <p className="mt-1 text-sm text-slate">
                        Access: {s.addresses.access_notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
            {profile.role === "crew_lead" && a.status === "crew_assigned" && (
              <form action={confirmCrewAssignment} className="mt-5">
                <input type="hidden" name="assignment" value={a.id} />
                <button className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">
                  Confirm crew readiness
                </button>
              </form>
            )}
            {profile.role === "crew_lead" && crewFieldActions[a.status] && (
              <form action={advanceFieldWork} className="mt-5">
                <input type="hidden" name="assignment" value={a.id} />
                <button
                  name="command"
                  value={crewFieldActions[a.status].command}
                  className="rounded-xl bg-navy px-5 py-3 font-bold text-white"
                >
                  {crewFieldActions[a.status].label}
                </button>
              </form>
            )}
          </article>
        ))}
        {!assignments?.length && (
          <p className="rounded-2xl border bg-white p-8 text-slate">
            No crew assignments.
          </p>
        )}
      </div>
    </RoleShell>
  );
}
