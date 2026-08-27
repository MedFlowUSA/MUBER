/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { IncidentEvidenceUpload } from "@/components/incident-evidence-upload";
import { requireOperationalRole } from "@/lib/authorization";
import { closeJob, reviewIncident } from "./actions";

export default async function IncidentQueue({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string; closed?: string }>;
}) {
  const { supabase, profile } = await requireOperationalRole(
    ["dispatcher", "compliance_admin", "super_admin"],
    "/dispatch/incidents",
  );
  const query = await searchParams;
  const { data: incidents } = await supabase
    .from("incidents")
    .select(
      "id,job_id,category,reported_severity,internal_severity,status,reported_at,description,injury_indicator,emergency_services_indicator,damage_indicator,missing_item_indicator,hazard_indicator,jobs(reference,status),incident_evidence(id,evidence_type,description,created_at)",
    )
    .order("reported_at", { ascending: false });
  const { data: completed } =
    profile.role === "compliance_admin"
      ? { data: [] }
      : await supabase
          .from("jobs")
          .select("id,reference,status")
          .eq("status", "completed")
          .order("created_at", { ascending: false });
  return (
    <RoleShell role="dispatch">
      <Link href="/dispatch" className="text-sm font-bold text-orange-600">
        ← Dispatch dashboard
      </Link>
      <p className="eyebrow mt-6">Controlled operations</p>
      <h1 className="mt-2 text-4xl font-black">Incidents and closure</h1>
      <p className="mt-3 text-slate">
        Reports are allegations until reviewed. No action here admits fault,
        settles payment, or creates an insurance decision.
      </p>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {(query.updated || query.closed) && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          The audited operation was recorded.
        </p>
      )}
      <section className="mt-8 grid gap-4">
        <h2 className="text-2xl font-black">Incident queue</h2>
        {(incidents || []).map((item: any) => (
          <article key={item.id} className="rounded-2xl border bg-white p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs font-black text-orange">
                  {item.jobs?.reference}
                </p>
                <h3 className="mt-1 text-xl font-black capitalize">
                  {item.category.replaceAll("_", " ")}
                </h3>
              </div>
              <span className="font-bold uppercase">
                {item.status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap">{item.description}</p>
            <p className="mt-3 text-sm font-bold text-red-700">
              Reported severity: {item.reported_severity}. Flags:{" "}
              {[
                item.injury_indicator && "injury",
                item.emergency_services_indicator && "emergency services",
                item.damage_indicator && "damage",
                item.missing_item_indicator && "missing item",
                item.hazard_indicator && "hazard",
              ]
                .filter(Boolean)
                .join(", ") || "none"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(item.incident_evidence || []).map((evidence: any) => (
                <a
                  key={evidence.id}
                  href={`/api/incident-evidence/${evidence.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border px-3 py-2 text-sm font-bold"
                >
                  View {evidence.evidence_type}
                </a>
              ))}
            </div>
            {!["resolved", "closed", "void"].includes(item.status) && (
              <IncidentEvidenceUpload incident={item.id} />
            )}
            {!["resolved", "closed", "void"].includes(item.status) && (
              <form
                action={reviewIncident}
                className="mt-5 grid gap-2 md:grid-cols-2"
              >
                <input type="hidden" name="incident" value={item.id} />
                <select name="action" className="rounded-xl border p-3">
                  <option value="triage">Begin triage</option>
                  <option value="request_customer">
                    Request customer information
                  </option>
                  <option value="request_provider">
                    Request provider information
                  </option>
                  <option value="investigate">Investigate</option>
                  <option value="propose_resolution">Propose resolution</option>
                  <option value="resolve">Resolve</option>
                </select>
                <select name="severity" className="rounded-xl border p-3">
                  <option value="">Keep severity</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <input
                  name="message"
                  required
                  minLength={10}
                  placeholder="Timeline message"
                  className="rounded-xl border p-3"
                />
                <input
                  name="internal_notes"
                  placeholder="Internal notes (never customer-visible)"
                  className="rounded-xl border p-3"
                />
                <button className="btn-primary md:col-span-2">
                  Record review action
                </button>
              </form>
            )}
          </article>
        ))}
        {!incidents?.length && (
          <p className="rounded-2xl border bg-white p-8 text-slate">
            No incident reports.
          </p>
        )}
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-black">Closure candidates</h2>
        <p className="mt-2 text-sm text-slate">
          The server checks completion approval, customer response window,
          incidents, claims, and information requests.
        </p>
        <div className="mt-4 grid gap-3">
          {profile.role !== "compliance_admin" &&
            (completed || []).map((job) => (
              <form
                key={job.id}
                action={closeJob}
                className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_2fr_auto]"
              >
                <input type="hidden" name="job" value={job.id} />
                <strong>{job.reference}</strong>
                <input
                  name="reason"
                  required
                  minLength={10}
                  placeholder="Audited closure reason"
                  className="rounded-xl border p-3"
                />
                <button className="btn-primary">Check and close</button>
              </form>
            ))}
          {profile.role !== "compliance_admin" && !completed?.length && (
            <p className="rounded-2xl border bg-white p-8 text-slate">
              No completed jobs awaiting closure.
            </p>
          )}
        </div>
      </section>
    </RoleShell>
  );
}
