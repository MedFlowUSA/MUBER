import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type Detail = {
  id: string;
  incident_id: string;
  job_reference: string;
  claimant: string;
  loss_category: string;
  claimed_amount_cents?: number;
  currency: string;
  status: string;
  customer_description?: string;
  provider_response?: string;
  resolution_type?: string;
  customer_visible_resolution?: string;
  internal_resolution_notes?: string;
  approved_amount_placeholder_cents?: number;
  decision_at?: string;
  created_at: string;
  viewer_role: string;
  liability_admitted: boolean;
  payment_processed: boolean;
};
const shellRole = (
  role: string,
): "customer" | "provider" | "crew" | "dispatch" | "admin" =>
  role === "customer"
    ? "customer"
    : role.startsWith("provider_")
      ? "provider"
      : role.startsWith("crew_")
        ? "crew"
        : role === "dispatcher"
          ? "dispatch"
          : "admin";
const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
export default async function ClaimDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/claims/${id}`);
  const { data, error } = await supabase.rpc("get_claim_detail", {
    p_claim: id,
  });
  if (error || !data) notFound();
  const claim = data as Detail;
  return (
    <RoleShell role={shellRole(claim.viewer_role)}>
      <Link
        href={`/incidents/${claim.incident_id}`}
        className="text-sm font-bold text-orange-700"
      >
        ← Incident detail
      </Link>
      <p className="eyebrow mt-6">Claim · {claim.job_reference}</p>
      <div className="mt-2 flex flex-wrap justify-between gap-3">
        <h1 className="text-4xl font-black capitalize">
          {claim.loss_category.replaceAll("_", " ")}
        </h1>
        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase">
          {claim.status.replaceAll("_", " ")}
        </span>
      </div>
      <section className="card mt-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-bold text-slate">Claimant</dt>
            <dd>{claim.claimant}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-slate">Claimed amount</dt>
            <dd>
              {claim.claimed_amount_cents == null
                ? "Not supplied"
                : money(claim.claimed_amount_cents, claim.currency)}
            </dd>
          </div>
        </dl>
        {claim.customer_description && (
          <p className="mt-5 whitespace-pre-wrap">
            <strong>Customer description:</strong> {claim.customer_description}
          </p>
        )}
        {claim.provider_response && (
          <p className="mt-4 whitespace-pre-wrap">
            <strong>Contractor response:</strong> {claim.provider_response}
          </p>
        )}
        {claim.customer_visible_resolution && (
          <p className="mt-4 rounded-xl bg-warm p-4">
            <strong>Resolution update:</strong>{" "}
            {claim.customer_visible_resolution}
          </p>
        )}
        {claim.internal_resolution_notes && (
          <p className="mt-4 rounded-xl bg-red-50 p-4">
            <strong>Authorized internal decision information:</strong>{" "}
            {claim.internal_resolution_notes}
          </p>
        )}
      </section>
      <p className="mt-6 rounded-xl border p-4 text-sm text-slate">
        This record does not admit liability, promise insurance coverage,
        approve the claimed amount, or indicate that payment was processed.
      </p>
    </RoleShell>
  );
}
