import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { reviewSupportRequest } from "./actions";
type Props = { searchParams: Promise<{ error?: string; reviewed?: string }> };
export default async function SupportReviewPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/support",
  );
  const { data: requests } = await supabase
    .from("support_requests")
    .select(
      "id,profile_id,category,name,email,subject,details,job_reference,status,identity_verified_at,internal_notes,resolution_summary,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <RoleShell role="admin">
      <Link href="/admin" className="text-sm font-bold text-orange-600">
        ← Administration
      </Link>
      <p className="eyebrow mt-6">Support operations</p>
      <h1 className="mt-2 text-4xl font-black">Requests</h1>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {query.reviewed && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Review recorded and audited.
        </p>
      )}
      <div className="mt-8 grid gap-4">
        {(requests || []).map((request) => (
          <article key={request.id} className="rounded-2xl border bg-white p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-orange">
                  {request.category.replaceAll("_", " ")}
                </p>
                <h2 className="mt-1 text-xl font-black">{request.subject}</h2>
                <p className="mt-1 text-sm text-slate">
                  {request.name} · {request.email}
                  {request.job_reference ? ` · ${request.job_reference}` : ""}
                </p>
              </div>
              <span className="text-xs font-bold uppercase">
                {request.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm">
              {request.details}
            </p>
            <form action={reviewSupportRequest} className="mt-5 grid gap-3">
              <input type="hidden" name="request" value={request.id} />
              <select
                name="status"
                defaultValue={request.status}
                className="rounded-xl border px-4 py-3"
              >
                {[
                  "new",
                  "identity_verification_required",
                  "in_review",
                  "waiting_for_requester",
                  "resolved",
                  "closed",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              {request.category.startsWith("privacy_") &&
                !request.identity_verified_at && (
                  <label className="text-sm font-bold">
                    <input type="checkbox" name="identity_verified" /> I
                    completed identity verification outside this form
                  </label>
                )}
              <textarea
                name="internal_notes"
                defaultValue={request.internal_notes || ""}
                placeholder="Internal notes"
                className="min-h-24 rounded-xl border px-4 py-3"
              />
              <textarea
                name="resolution"
                defaultValue={request.resolution_summary || ""}
                placeholder="Resolution summary (required to resolve or close)"
                className="min-h-24 rounded-xl border px-4 py-3"
              />
              <button className="rounded-xl bg-navy px-5 py-3 font-bold text-white">
                Save review
              </button>
            </form>
          </article>
        ))}
        {!requests?.length && (
          <p className="rounded-2xl border bg-white p-8 text-slate">
            No support requests have been submitted.
          </p>
        )}
      </div>
    </RoleShell>
  );
}
