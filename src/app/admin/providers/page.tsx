import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { reviewProviderApplication } from "./actions";

type Props = { searchParams: Promise<{ error?: string; reviewed?: string }> };

export default async function ProviderReviewsPage({ searchParams }: Props) {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/providers",
  );
  const params = await searchParams;
  const { data: applications } = await supabase
    .from("provider_applications")
    .select(
      "id,legal_name,dba_name,contact_name,business_email,service_categories,service_territory,status,submitted_at,internal_reason",
    )
    .order("created_at", { ascending: false });

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
    </RoleShell>
  );
}
