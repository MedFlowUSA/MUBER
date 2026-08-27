import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import Link from "next/link";
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
    { count: credentials },
    { count: vehicles },
    { count: crews },
    { count: upcomingJobs },
  ] = await Promise.all([
    supabase
      .from("provider_companies")
      .select(
        "id,display_name,legal_name,status,available,same_day_available,service_categories",
      )
      .maybeSingle(),
    supabase
      .from("provider_credentials")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified"),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("crews")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .in("status", ["accepted", "crew_assigned", "crew_confirmed", "ready"]),
  ]);
  const readiness = [
    { label: "Company approved", ready: company?.status === "approved" },
    { label: "Accepting offers", ready: Boolean(company?.available) },
    { label: "Verified credentials", ready: Boolean(credentials) },
    { label: "Active vehicle", ready: Boolean(vehicles) },
    { label: "Active crew", ready: Boolean(crews) },
  ];
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
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pending offers", pendingOffers || 0],
          ["Upcoming jobs", upcomingJobs || 0],
          ["Active vehicles", vehicles || 0],
          ["Active crews", crews || 0],
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
            <h2 className="text-2xl font-black">Dispatch readiness</h2>
            <p className="mt-2 text-sm text-slate">
              Eligibility is still evaluated per job and legally required
              credentials cannot be overridden.
            </p>
          </div>
          <Link href="/provider/profile" className="btn-ghost">
            Edit company profile
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {readiness.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl p-4 text-sm font-bold ${item.ready ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
            >
              {item.ready ? "Ready" : "Needs attention"}
              <span className="mt-1 block font-normal">{item.label}</span>
            </div>
          ))}
        </div>
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
