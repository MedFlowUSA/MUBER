import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { OFFER_STATUSES, parseProviderWorkQuery } from "@/lib/queue-query";
import { respondToOffer } from "./actions";
type Props = {
  searchParams: Promise<{
    error?: string;
    accepted?: string;
    declined?: string;
    status?: string;
    page?: string;
  }>;
};
export default async function OffersPage({ searchParams }: Props) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/offers",
  );
  const query = await searchParams;
  const filters = parseProviderWorkQuery(query, "offer");
  let offerQuery = supabase
    .from("provider_offers")
    .select(
      "id,job_id,approximate_pickup_area,approximate_destination_area,scope,required_vehicle,required_crew_size,estimated_duration_minutes,compensation_cents,currency,expires_at,status,decline_reason,created_at",
      { count: "exact" },
    );
  if (filters.status) offerQuery = offerQuery.eq("status", filters.status);
  const start = (filters.page - 1) * filters.pageSize;
  const { data: offers, count } = await offerQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + filters.pageSize - 1);
  const pages = Math.max(1, Math.ceil((count || 0) / filters.pageSize));
  const href = (page: number) =>
    `/provider/offers?status=${encodeURIComponent(filters.status)}&page=${page}`;
  return (
    <RoleShell role="provider">
      <Link
        href="/provider/dashboard"
        className="text-sm font-bold text-orange-600"
      >
        ← Provider dashboard
      </Link>
      <p className="eyebrow mt-6">Company opportunities</p>
      <h1 className="mt-2 text-4xl font-black">Job offers</h1>
      <p className="mt-3 text-slate">
        Exact customer addresses and unnecessary contact information remain
        hidden until assignment.
      </p>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {(query.accepted || query.declined) && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Your response was recorded and audited.
        </p>
      )}
      <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_auto]">
        <select
          name="status"
          defaultValue={filters.status}
          className="rounded-xl border p-3"
        >
          <option value="">All statuses</option>
          {OFFER_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button className="btn-primary">Apply filter</button>
      </form>
      <div className="mt-8 grid gap-4">
        {(offers || []).map((offer) => (
          <article key={offer.id} className="rounded-2xl border bg-white p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs font-black text-orange">
                  {offer.approximate_pickup_area || "Area pending"}
                  {offer.approximate_destination_area
                    ? ` → ${offer.approximate_destination_area}`
                    : ""}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  ${(offer.compensation_cents / 100).toFixed(2)} provider
                  compensation
                </h2>
              </div>
              <span className="text-xs font-bold uppercase">
                {offer.status}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap">{offer.scope}</p>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate">Vehicle</dt>
                <dd className="font-bold">
                  {offer.required_vehicle || "Best fit"}
                </dd>
              </div>
              <div>
                <dt className="text-slate">Crew</dt>
                <dd className="font-bold">
                  {offer.required_crew_size || "As scoped"}
                </dd>
              </div>
              <div>
                <dt className="text-slate">Duration</dt>
                <dd className="font-bold">
                  {offer.estimated_duration_minutes} minutes
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate">
              Expires {new Date(offer.expires_at).toLocaleString()}
            </p>
            {["sent", "viewed"].includes(offer.status) &&
              new Date(offer.expires_at) > new Date() && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <form action={respondToOffer}>
                    <input type="hidden" name="offer" value={offer.id} />
                    <button
                      name="response"
                      value="accept"
                      className="w-full rounded-xl bg-orange-600 px-5 py-3 font-bold text-white"
                    >
                      Accept exclusive offer
                    </button>
                  </form>
                  <form
                    action={respondToOffer}
                    className="grid gap-2 sm:grid-cols-[1fr_auto]"
                  >
                    <input type="hidden" name="offer" value={offer.id} />
                    <select
                      name="decline_reason"
                      required
                      className="rounded-xl border px-3 py-2"
                    >
                      <option value="">Decline reason</option>
                      {[
                        "schedule_conflict",
                        "vehicle_unavailable",
                        "crew_unavailable",
                        "scope_mismatch",
                        "compensation",
                        "outside_service_area",
                        "other",
                      ].map((reason) => (
                        <option key={reason} value={reason}>
                          {reason.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      name="response"
                      value="decline"
                      className="rounded-xl border border-red-300 px-5 py-3 font-bold text-red-700"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              )}
          </article>
        ))}
        {!offers?.length && (
          <p className="rounded-2xl border bg-white p-8 text-slate">
            No offers are available for your company.
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
