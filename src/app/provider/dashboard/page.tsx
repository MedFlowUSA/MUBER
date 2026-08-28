import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import Link from "next/link";
import { ConversationWorkload } from "@/components/conversation-workload";
import { getProviderReadiness } from "@/lib/provider-readiness";
export default async function Page() {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager", "super_admin"],
    "/provider/dashboard",
  );
  const { count: pendingOffers } = await supabase
    .from("provider_offers")
    .select("id", { count: "exact", head: true })
    .in("status", ["sent", "viewed"]);
  const [
    { data: company },
    { data: credentials },
    { data: vehicles },
    { data: crews },
    { count: upcomingJobs },
    { data: conversationCounts },
    { data: serviceDate },
  ] = await Promise.all([
    supabase
      .from("provider_companies")
      .select(
        "id,display_name,legal_name,status,available,same_day_available,service_categories",
      )
      .maybeSingle(),
    supabase
      .from("provider_credentials")
      .select("verification_status,expires_at"),
    supabase.from("vehicles").select("active,insurance_eligible"),
    supabase.from("crews").select("active"),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .in("status", ["accepted", "crew_assigned", "crew_confirmed", "ready"]),
    supabase.rpc("conversation_workload_counts"),
    supabase.rpc("current_service_date"),
  ]);
  const readiness = getProviderReadiness({
    companyStatus: company?.status,
    available: company?.available,
    credentials: credentials || [],
    vehicles: vehicles || [],
    crews: crews || [],
    serviceDate: serviceDate || new Date().toISOString().slice(0, 10),
  });
  const activeVehicles = (vehicles || []).filter(
    (vehicle) => vehicle.active,
  ).length;
  const activeCrews = (crews || []).filter((crew) => crew.active).length;
  return (
    <RoleShell role="provider">
      <p className="eyebrow">Contractor company portal</p>
      <h1 className="mt-2 text-4xl font-black">
        {company?.display_name ||
          company?.legal_name ||
          "Contractor operations"}
      </h1>
      <p className="mt-3 text-slate">
        Manage readiness, incoming offers, and scheduled work from one protected
        workspace.
      </p>
      <ConversationWorkload counts={conversationCounts} />
      {company?.status === "suspended" && (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-black">New work is temporarily unavailable</h2>
          <p className="mt-2 text-sm">
            MUBER has paused new offers and assignments for this contractor.
            Existing work and historical records remain available. Review your
            notifications or contact support for the operational next step.
          </p>
        </div>
      )}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pending offers", pendingOffers || 0],
          ["Upcoming jobs", upcomingJobs || 0],
          ["Active vehicles", activeVehicles],
          ["Active crews", activeCrews],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white p-5">
            <p className="text-sm font-bold text-slate">{label}</p>
            <p className="mt-2 text-4xl font-black">{value}</p>
          </div>
        ))}
      </section>
      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">
              {readiness.ready
                ? "Ready for job matching"
                : "Dispatch readiness"}
            </h2>
            <p className="mt-2 text-sm text-slate">
              {readiness.readyCount} of {readiness.items.length} company-level
              readiness checks complete. Eligibility is also evaluated for each
              job, and legally required credentials cannot be overridden.
            </p>
          </div>
          <Link href="/provider/profile" className="btn-ghost">
            Edit company profile
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {readiness.items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-xl p-4 text-sm font-bold transition hover:-translate-y-0.5 ${item.ready ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
            >
              {item.ready ? "Ready" : "Needs attention"}
              <span className="mt-1 block">{item.label}</span>
              <span className="mt-2 block font-normal">{item.detail}</span>
            </Link>
          ))}
        </div>
        {readiness.expiringCredentials.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-black">Credential renewal warning</p>
            <p className="mt-1">
              {readiness.expiringCredentials.length} verified credential
              {readiness.expiringCredentials.length === 1
                ? " expires"
                : "s expire"}{" "}
              within 30 days. The next expires in{" "}
              {readiness.expiringCredentials[0].daysRemaining} days.
            </p>
            <Link
              href="/provider/credentials"
              className="mt-2 inline-block font-bold underline"
            >
              Review credentials
            </Link>
          </div>
        )}
      </section>
      <Link
        href="/provider/jobs"
        className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
      >
        Schedule accepted jobs
      </Link>
      <Link
        href="/provider/offers"
        className="mt-6 ml-3 inline-flex rounded-xl bg-navy px-5 py-3 font-bold text-white"
      >
        Review job offers
      </Link>
      <Link
        href="/provider/credentials"
        className="mt-6 ml-3 inline-flex rounded-xl bg-orange-600 px-5 py-3 font-bold text-white"
      >
        Manage credentials
      </Link>
      <Link
        href="/provider/fleet"
        className="mt-6 ml-3 inline-flex rounded-xl border border-orange-600 px-5 py-3 font-bold text-orange-700"
      >
        Manage vehicles and crews
      </Link>
    </RoleShell>
  );
}
