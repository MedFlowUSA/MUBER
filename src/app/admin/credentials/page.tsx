import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import {
  CREDENTIAL_STATUSES,
  parseComplianceQueueQuery,
} from "@/lib/queue-query";
import { reviewCredential } from "./actions";

type Props = {
  searchParams: Promise<{
    error?: string;
    reviewed?: string;
    status?: string;
    type?: string;
    page?: string;
  }>;
};
export default async function CredentialReviews({ searchParams }: Props) {
  const { supabase } = await requireOperationalRole(
    ["compliance_admin", "super_admin"],
    "/admin/credentials",
  );
  const params = await searchParams;
  const filters = parseComplianceQueueQuery(params, "credential");
  let credentialQuery = supabase
    .from("provider_credentials")
    .select(
      "id,credential_type,credential_number,issuing_authority,expires_at,verification_status,submitted_at,rejection_reason,private_storage_path,provider_companies(legal_name)",
      { count: "exact" },
    );
  if (filters.status)
    credentialQuery = credentialQuery.eq("verification_status", filters.status);
  if (filters.type)
    credentialQuery = credentialQuery.eq("credential_type", filters.type);
  const start = (filters.page - 1) * filters.pageSize;
  const { data: credentials, count } = await credentialQuery
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(start, start + filters.pageSize - 1);
  const pages = Math.max(1, Math.ceil((count || 0) / filters.pageSize));
  const href = (page: number) => {
    const p = new URLSearchParams();
    if (filters.status) p.set("status", filters.status);
    if (filters.type) p.set("type", filters.type);
    p.set("page", String(page));
    return `/admin/credentials?${p}`;
  };
  return (
    <RoleShell role="admin">
      <Link href="/admin" className="text-sm font-bold text-orange-600">
        ← Administration
      </Link>
      <p className="eyebrow mt-6">Compliance review</p>
      <h1 className="mt-2 text-4xl font-black">Provider credentials</h1>
      {params.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {params.error}
        </p>
      )}
      {params.reviewed && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Decision recorded and audited.
        </p>
      )}
      <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
        <input
          name="type"
          defaultValue={filters.type}
          maxLength={60}
          placeholder="Exact credential type"
          className="rounded-xl border p-3"
        />
        <select
          name="status"
          defaultValue={filters.status}
          className="rounded-xl border p-3"
        >
          <option value="">All statuses</option>
          {CREDENTIAL_STATUSES.map((status) => (
            <option key={status}>{status.replaceAll("_", " ")}</option>
          ))}
        </select>
        <button className="btn-primary">Apply filters</button>
      </form>
      <div className="mt-8 grid gap-4">
        {(credentials || []).map((c) => (
          <article
            key={c.id}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-black">
                {c.credential_type.replaceAll("_", " ")}
              </h2>
              <span className="text-xs font-bold uppercase">
                {c.verification_status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {c.issuing_authority || "Issuer not supplied"}
              {c.expires_at ? ` · Expires ${c.expires_at}` : ""}
            </p>
            {c.private_storage_path && (
              <a
                href={`/api/provider/credentials/${c.id}/document`}
                className="mt-3 inline-block text-sm font-bold text-orange-600"
              >
                Open private document
              </a>
            )}
            {["submitted", "under_review", "verified"].includes(
              c.verification_status,
            ) && (
              <form
                action={reviewCredential}
                className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"
              >
                <input type="hidden" name="credential" value={c.id} />
                <input
                  name="reason"
                  aria-label="Internal credential decision reason"
                  placeholder="Required for rejection or suspension"
                  className="rounded-xl border border-slate-300 px-4 py-3"
                />
                {c.verification_status === "submitted" && (
                  <button
                    name="decision"
                    value="under_review"
                    className="rounded-xl border px-4 py-3 font-bold"
                  >
                    Start review
                  </button>
                )}
                {c.verification_status !== "verified" && (
                  <>
                    <button
                      name="decision"
                      value="rejected"
                      className="rounded-xl border border-red-300 px-4 py-3 font-bold text-red-700"
                    >
                      Reject
                    </button>
                    <button
                      name="decision"
                      value="verified"
                      className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white"
                    >
                      Verify
                    </button>
                  </>
                )}
                {c.verification_status === "verified" && (
                  <button
                    name="decision"
                    value="suspended"
                    className="rounded-xl border border-red-300 px-4 py-3 font-bold text-red-700"
                  >
                    Suspend
                  </button>
                )}
              </form>
            )}
          </article>
        ))}
        {!credentials?.length && (
          <p className="rounded-2xl border bg-white p-8 text-slate-600">
            No credentials have been submitted.
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
