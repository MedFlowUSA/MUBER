import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import {
  APPLICATION_STATUSES,
  parseProviderQueueQuery,
  PROVIDER_STATUSES,
} from "@/lib/queue-query";
import { manageProviderStatus, reviewProviderApplication } from "./actions";

type Props = {
  searchParams: Promise<{
    error?: string;
    reviewed?: string;
    provider_updated?: string;
    active_jobs?: string;
    provider_q?: string;
    provider_status?: string;
    provider_page?: string;
    application_q?: string;
    application_status?: string;
    application_page?: string;
  }>;
};

export default async function ProviderReviewsPage({ searchParams }: Props) {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/providers",
  );
  const params = await searchParams;
  const filters = parseProviderQueueQuery(params);
  let applicationQuery = supabase
    .from("provider_applications")
    .select(
      "id,legal_name,dba_name,contact_name,business_email,service_categories,service_territory,status,submitted_at,internal_reason",
      { count: "exact" },
    );
  if (filters.applicationQ)
    applicationQuery = applicationQuery.ilike(
      "legal_name",
      `${filters.applicationQ}%`,
    );
  if (filters.applicationStatus)
    applicationQuery = applicationQuery.eq("status", filters.applicationStatus);
  let providerQuery = supabase
    .from("provider_companies")
    .select(
      "id,legal_name,display_name,status,available,provider_status_events(from_status,to_status,reason_category,customer_safe_message,effective_at,review_at)",
      { count: "exact" },
    );
  if (filters.providerQ)
    providerQuery = providerQuery.ilike("legal_name", `${filters.providerQ}%`);
  if (filters.providerStatus)
    providerQuery = providerQuery.eq("status", filters.providerStatus);
  const providerStart = (filters.providerPage - 1) * filters.pageSize,
    applicationStart = (filters.applicationPage - 1) * filters.pageSize;
  const [
    { data: applications, count: applicationCount },
    { data: providers, count: providerCount },
  ] = await Promise.all([
    applicationQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(applicationStart, applicationStart + filters.pageSize - 1),
    providerQuery
      .order("legal_name")
      .order("id")
      .range(providerStart, providerStart + filters.pageSize - 1),
  ]);
  const href = (kind: "provider" | "application", page: number) => {
    const p = new URLSearchParams();
    if (filters.providerQ) p.set("provider_q", filters.providerQ);
    if (filters.providerStatus)
      p.set("provider_status", filters.providerStatus);
    if (filters.applicationQ) p.set("application_q", filters.applicationQ);
    if (filters.applicationStatus)
      p.set("application_status", filters.applicationStatus);
    p.set(`${kind}_page`, String(page));
    p.set(
      `${kind === "provider" ? "application" : "provider"}_page`,
      String(
        kind === "provider" ? filters.applicationPage : filters.providerPage,
      ),
    );
    return `/admin/providers?${p}`;
  };
  const providerPages = Math.max(
      1,
      Math.ceil((providerCount || 0) / filters.pageSize),
    ),
    applicationPages = Math.max(
      1,
      Math.ceil((applicationCount || 0) / filters.pageSize),
    );

  return (
    <RoleShell role="admin">
      <Link href="/admin" className="text-sm font-bold text-orange-600">
        ← Administration
      </Link>
      <p className="eyebrow mt-6">Compliance review</p>
      <h1 className="mt-2 text-4xl font-black">Provider applications</h1>
      <p className="mt-3 max-w-3xl text-slate-600">
        Approval creates the provider company and owner membership atomically.
        It does not enable payments.
      </p>
      {params.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {params.error}
        </p>
      )}
      {params.reviewed && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Review recorded and audited.
        </p>
      )}
      {params.provider_updated && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Contractor status updated and audited. Active jobs requiring dispatch
          review: {params.active_jobs || "0"}.
        </p>
      )}
      <section className="mt-8">
        <h2 className="text-2xl font-black">Approved contractor controls</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Suspension blocks new offers and assignments without deleting users,
          jobs, evidence, credentials, or history. Active jobs remain visible
          and are flagged for dispatch review.
        </p>
        <form className="mt-5 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
          <input
            name="provider_q"
            defaultValue={filters.providerQ}
            maxLength={80}
            placeholder="Legal-name prefix"
            className="rounded-xl border p-3"
          />
          <select
            name="provider_status"
            defaultValue={filters.providerStatus}
            className="rounded-xl border p-3"
          >
            <option value="">All statuses</option>
            {PROVIDER_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <button className="btn-primary">Filter contractors</button>
        </form>
        <div className="mt-5 grid gap-5">
          {(providers || []).map((provider) => (
            <article
              key={provider.id}
              className="rounded-2xl border bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">
                    {provider.display_name || provider.legal_name}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {provider.legal_name}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">
                  {provider.status}
                </span>
              </div>
              {provider.provider_status_events?.length > 0 && (
                <div className="mt-4 rounded-xl bg-warm p-4 text-sm">
                  <strong>Recent status history</strong>
                  {provider.provider_status_events
                    .sort(
                      (a, b) =>
                        new Date(b.effective_at).getTime() -
                        new Date(a.effective_at).getTime(),
                    )
                    .slice(0, 3)
                    .map((event) => (
                      <p key={event.effective_at} className="mt-2">
                        {event.from_status} → {event.to_status} ·{" "}
                        {event.reason_category.replaceAll("_", " ")} ·{" "}
                        {new Date(event.effective_at).toLocaleString()}
                      </p>
                    ))}
                </div>
              )}
              {["approved", "suspended"].includes(provider.status) && (
                <form
                  action={manageProviderStatus}
                  className="mt-5 grid gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="provider" value={provider.id} />
                  <label className="font-bold">
                    Reason category
                    <select
                      name="reason_category"
                      required
                      className="mt-1 block w-full rounded-xl border p-3 font-normal"
                    >
                      <option value="">Choose a category</option>
                      {[
                        "credential_issue",
                        "safety_review",
                        "service_quality",
                        "legal_or_regulatory",
                        "operational_review",
                        "provider_request",
                        "other",
                      ].map((reason) => (
                        <option key={reason} value={reason}>
                          {reason.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="font-bold">
                    Optional review date
                    <input
                      name="review_at"
                      type="datetime-local"
                      className="mt-1 block w-full rounded-xl border p-3 font-normal"
                    />
                  </label>
                  <label className="font-bold md:col-span-2">
                    Internal reason
                    <textarea
                      name="internal_reason"
                      required
                      minLength={10}
                      maxLength={4000}
                      className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"
                    />
                  </label>
                  <label className="font-bold md:col-span-2">
                    Contractor-safe operational message
                    <textarea
                      name="customer_message"
                      required
                      minLength={10}
                      maxLength={500}
                      placeholder="Neutral operational wording without allegations"
                      className="mt-1 min-h-20 w-full rounded-xl border p-3 font-normal"
                    />
                  </label>
                  <button
                    name="provider_action"
                    value={
                      provider.status === "approved" ? "suspend" : "reactivate"
                    }
                    className={`rounded-xl px-5 py-3 font-bold text-white md:col-span-2 ${provider.status === "approved" ? "bg-red-700" : "bg-emerald-700"}`}
                  >
                    {provider.status === "approved"
                      ? "Suspend contractor"
                      : "Reactivate contractor"}
                  </button>
                </form>
              )}
            </article>
          ))}
          {!providers?.length && (
            <p className="rounded-2xl border bg-white p-6 text-slate-600">
              No contractor organizations exist yet.
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Link
            href={href("provider", Math.max(1, filters.providerPage - 1))}
            className={`btn-ghost ${filters.providerPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span className="text-sm font-bold">
            Page {filters.providerPage} of {providerPages} ·{" "}
            {providerCount || 0}
          </span>
          <Link
            href={href(
              "provider",
              Math.min(providerPages, filters.providerPage + 1),
            )}
            className={`btn-ghost ${filters.providerPage >= providerPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      </section>
      <form className="mt-8 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
        <input
          name="application_q"
          defaultValue={filters.applicationQ}
          maxLength={80}
          placeholder="Applicant legal-name prefix"
          className="rounded-xl border p-3"
        />
        <select
          name="application_status"
          defaultValue={filters.applicationStatus}
          className="rounded-xl border p-3"
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status}>{status.replaceAll("_", " ")}</option>
          ))}
        </select>
        <button className="btn-primary">Filter applications</button>
      </form>
      <div className="mt-8 grid gap-5">
        {(applications || []).map((application) => (
          <article
            key={application.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  {application.dba_name || application.legal_name}
                </h2>
                <p className="text-sm text-slate-600">
                  {application.legal_name} · {application.contact_name} ·{" "}
                  {application.business_email}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                {application.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-4 text-sm">
              <strong>Services:</strong>{" "}
              {application.service_categories.join(", ") || "Not specified"}
            </p>
            <p className="mt-2 text-sm">
              <strong>Territory:</strong> {application.service_territory}
            </p>
            {application.internal_reason && (
              <p className="mt-2 text-sm text-red-800">
                <strong>Internal reason:</strong> {application.internal_reason}
              </p>
            )}
            {!["approved", "rejected", "suspended"].includes(
              application.status,
            ) && (
              <form
                action={reviewProviderApplication}
                className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]"
              >
                <input
                  type="hidden"
                  name="application"
                  value={application.id}
                />
                <input
                  name="reason"
                  aria-label="Internal review reason"
                  placeholder="Required for information requests or rejection"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
                {application.status === "submitted" && (
                  <button
                    name="decision"
                    value="under_review"
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"
                  >
                    Start review
                  </button>
                )}
                <button
                  name="decision"
                  value="information_requested"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"
                >
                  Request info
                </button>
                <button
                  name="decision"
                  value="rejected"
                  className="rounded-xl border border-red-300 px-4 py-3 text-sm font-bold text-red-700"
                >
                  Reject
                </button>
                <button
                  name="decision"
                  value="approved"
                  className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white"
                >
                  Approve
                </button>
              </form>
            )}
          </article>
        ))}
        {!applications?.length && (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
            No provider applications are waiting for review.
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Link
          href={href("application", Math.max(1, filters.applicationPage - 1))}
          className={`btn-ghost ${filters.applicationPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
        >
          Previous
        </Link>
        <span className="text-sm font-bold">
          Page {filters.applicationPage} of {applicationPages} ·{" "}
          {applicationCount || 0}
        </span>
        <Link
          href={href(
            "application",
            Math.min(applicationPages, filters.applicationPage + 1),
          )}
          className={`btn-ghost ${filters.applicationPage >= applicationPages ? "pointer-events-none opacity-50" : ""}`}
        >
          Next
        </Link>
      </div>
    </RoleShell>
  );
}
