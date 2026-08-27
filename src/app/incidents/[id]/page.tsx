import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { IncidentEvidenceUpload } from "@/components/incident-evidence-upload";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Detail = {
  id: string;
  job_id: string;
  job_reference: string;
  category: string;
  reported_severity: string;
  internal_severity?: string;
  reporter_role: string;
  occurred_at: string;
  reported_at: string;
  status: string;
  description: string;
  immediate_safety_action?: string;
  customer_visible_summary?: string;
  internal_notes?: string;
  assigned_reviewer?: string;
  resolution_summary?: string;
  resolved_at?: string;
  incident_hold: boolean;
  viewer_role: string;
  updates: {
    id: string;
    from_status?: string;
    to_status?: string;
    message: string;
    created_at: string;
  }[];
  evidence: {
    id: string;
    evidence_type: string;
    description?: string;
    created_at: string;
  }[];
  claims: {
    id: string;
    status: string;
    loss_category: string;
    created_at: string;
  }[];
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
export default async function IncidentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/incidents/${id}`);
  const { data, error } = await supabase.rpc("get_incident_detail", {
    p_incident: id,
  });
  if (error || !data) notFound();
  const incident = data as Detail;
  return (
    <RoleShell role={shellRole(incident.viewer_role)}>
      <Link
        href={
          incident.viewer_role === "customer"
            ? `/customer/jobs/${incident.job_id}`
            : "/dispatch/incidents"
        }
        className="text-sm font-bold text-orange-700"
      >
        ← Back
      </Link>
      <p className="eyebrow mt-6">Incident {incident.job_reference}</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-4xl font-black capitalize">
          {incident.category.replaceAll("_", " ")}
        </h1>
        <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black uppercase">
          {incident.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate">
        Reported {new Date(incident.reported_at).toLocaleString()} · occurred{" "}
        {new Date(incident.occurred_at).toLocaleString()} · reporter role{" "}
        {incident.reporter_role.replaceAll("_", " ")}
      </p>
      <section className="card mt-6">
        <h2 className="text-xl font-black">Reported concern</h2>
        <p className="mt-4 whitespace-pre-wrap">{incident.description}</p>
        {incident.immediate_safety_action && (
          <p className="mt-3">
            <strong>Immediate safety action:</strong>{" "}
            {incident.immediate_safety_action}
          </p>
        )}
        <p className="mt-3 font-bold text-red-700">
          Reported severity: {incident.reported_severity}
          {incident.internal_severity
            ? ` · Internal severity: ${incident.internal_severity}`
            : ""}
        </p>
        {incident.incident_hold && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 font-bold">
            This job is on incident hold.
          </p>
        )}
        {incident.internal_notes && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm">
            <strong>Authorized internal notes:</strong>{" "}
            {incident.internal_notes}
          </p>
        )}
      </section>
      <section className="card mt-6">
        <h2 className="text-xl font-black">Resolution timeline</h2>
        <ol className="mt-4 space-y-3">
          {incident.updates.map((update) => (
            <li key={update.id} className="border-l-2 border-orange pl-4">
              <p>{update.message}</p>
              <p className="text-xs text-slate">
                {new Date(update.created_at).toLocaleString()}
              </p>
            </li>
          ))}
          {!incident.updates.length && (
            <p className="text-sm text-slate">No visible review updates yet.</p>
          )}
        </ol>
        {incident.resolution_summary && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-4">
            {incident.resolution_summary}
          </p>
        )}
      </section>
      <section className="card mt-6">
        <h2 className="text-xl font-black">Authorized evidence</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {incident.evidence.map((item) => (
            <a
              key={item.id}
              href={`/api/incident-evidence/${item.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border px-3 py-2 font-bold"
            >
              View {item.evidence_type}
            </a>
          ))}
          {!incident.evidence.length && (
            <p className="text-sm text-slate">
              No evidence is visible to your role.
            </p>
          )}
        </div>
        {!["resolved", "closed", "void"].includes(incident.status) && (
          <IncidentEvidenceUpload incident={incident.id} />
        )}
      </section>
      {Boolean(incident.claims.length) && (
        <section className="card mt-6">
          <h2 className="text-xl font-black">Related claims</h2>
          <div className="mt-4 grid gap-3">
            {incident.claims.map((claim) => (
              <Link
                key={claim.id}
                href={`/claims/${claim.id}`}
                className="rounded-xl border p-4 font-bold capitalize"
              >
                {claim.loss_category.replaceAll("_", " ")} ·{" "}
                {claim.status.replaceAll("_", " ")}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate">
            A claim record does not determine fault, coverage, or payment.
          </p>
        </section>
      )}
    </RoleShell>
  );
}
