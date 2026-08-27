import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { submitCredential } from "./actions";

type Props = { searchParams: Promise<{ error?: string; submitted?: string }> };
const labels: Record<string, string> = {
  general_liability: "General liability insurance",
  commercial_auto: "Commercial auto insurance",
  cargo_insurance: "Cargo insurance",
  ca_household_mover_permit: "California household-mover permit",
  business_license: "Business license",
  driver_qualification: "Driver qualification",
  disposal_documentation: "Disposal-facility documentation",
  w9_status: "W-9 status",
  other: "Other credential",
};

export default async function CredentialsPage({ searchParams }: Props) {
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/credentials",
  );
  const params = await searchParams;
  const { data: credentials } = await supabase
    .from("provider_credentials")
    .select(
      "id,credential_type,issuing_authority,expires_at,verification_status,submitted_at,rejection_reason,private_storage_path",
    )
    .order("created_at", { ascending: false });
  const today = Date.now();
  return (
    <RoleShell role="provider">
      <Link
        href="/provider/dashboard"
        className="text-sm font-bold text-orange-600"
      >
        ← Provider dashboard
      </Link>
      <p className="eyebrow mt-6">Company readiness</p>
      <h1 className="mt-2 text-4xl font-black">Credentials</h1>
      <p className="mt-3 text-slate-600">
        Documents are private and available only to your provider managers and
        authorized compliance reviewers.
      </p>
      {params.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {params.error}
        </p>
      )}
      {params.submitted && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Credential submitted for review.
        </p>
      )}
      <form
        action={submitCredential}
        className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:grid-cols-2"
      >
        <select
          name="credential_type"
          required
          className="rounded-xl border border-slate-300 px-4 py-3"
        >
          <option value="">Credential type</option>
          {Object.entries(labels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          name="credential_number"
          placeholder="Credential number (if applicable)"
          className="rounded-xl border border-slate-300 px-4 py-3"
        />
        <input
          name="issuing_authority"
          placeholder="Issuing authority"
          className="rounded-xl border border-slate-300 px-4 py-3"
        />
        <label className="text-sm font-bold">
          Issue date
          <input
            name="issued_at"
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
          />
        </label>
        <label className="text-sm font-bold">
          Expiration date
          <input
            name="expires_at"
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
          />
        </label>
        <label className="text-sm font-bold">
          Private document
          <input
            name="document"
            type="file"
            required
            accept=".pdf,image/jpeg,image/png,image/webp"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
          />
        </label>
        <button className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white md:col-span-2">
          Submit credential
        </button>
      </form>
      <div className="mt-8 grid gap-4">
        {(credentials || []).map((c) => {
          const days = c.expires_at
            ? Math.ceil(
                (new Date(`${c.expires_at}T00:00:00`).getTime() - today) /
                  86400000,
              )
            : null;
          return (
            <article
              key={c.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="font-black">
                  {labels[c.credential_type] || c.credential_type}
                </h2>
                <span className="text-xs font-bold uppercase">
                  {c.verification_status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {c.issuing_authority || "Issuer not supplied"}
                {c.expires_at ? ` · Expires ${c.expires_at}` : ""}
              </p>
              {days !== null && days <= 30 && (
                <p
                  className={`mt-2 text-sm font-bold ${days <= 7 ? "text-red-700" : "text-amber-700"}`}
                >
                  {days < 0 ? "Expired" : `Expires in ${days} days`}
                </p>
              )}
              {c.rejection_reason && (
                <p className="mt-2 text-sm text-red-700">
                  Action required: {c.rejection_reason}
                </p>
              )}
              {c.private_storage_path && (
                <a
                  href={`/api/provider/credentials/${c.id}/document`}
                  className="mt-3 inline-block text-sm font-bold text-orange-600"
                >
                  View private document
                </a>
              )}
            </article>
          );
        })}
      </div>
    </RoleShell>
  );
}
