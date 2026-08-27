/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { IncidentEvidenceUpload } from "@/components/incident-evidence-upload";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { statusForCustomer } from "@/lib/job-status";
import {
  acceptQuote,
  reportIncident,
  requestCancellation,
  respondToCompletion,
  respondToInformationRequest,
  withdrawCancellation,
} from "./actions";
type CustomerQuote = {
  id: string;
  version: number;
  service_subtotal_cents: number;
  disposal_cents: number;
  travel_cents: number;
  other_cents: number;
  total_cents: number;
  customer_scope: string;
  expires_at: string;
  status: string;
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    accepted?: string;
    completion_response?: string;
    incident_reported?: string;
    information_sent?: string;
    cancellation_requested?: string;
    cancellation_withdrawn?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/customer/jobs/${id}`);
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id,reference,service,status,preferred_start,time_window,description,created_at,job_stops(stop_order,stop_type,addresses(line1,line2,city,region,postal_code,access_notes)),job_items(category,description,quantity,heavy),job_media(id,storage_path,mime_type),job_status_events(status,occurred_at,note)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!job) notFound();
  const { data: quotes } = await supabase.rpc("get_my_quote_versions", {
    p_job: id,
  });
  const { data: completions } = await supabase.rpc("get_my_completion", {
    p_job: id,
  });
  const completion = completions?.[0];
  const { data: completionMedia } = await supabase
    .from("completion_media")
    .select("id,purpose,mime_type")
    .eq("job_id", id);
  const { data: incidents } = await supabase
    .from("incidents")
    .select(
      "id,category,status,reported_at,customer_visible_summary,incident_evidence(id,evidence_type,description,created_at)",
    )
    .eq("job_id", id)
    .order("reported_at", { ascending: false });
  const { data: informationRequests } = await supabase
    .from("job_information_requests")
    .select(
      "id,prompt,status,created_at,job_information_responses(response,created_at)",
    )
    .eq("job_id", id)
    .order("created_at", { ascending: false });
  const { data: cancellationRequests } = await supabase
    .from("job_cancellation_requests")
    .select(
      "id,reason,customer_note,status,requested_at,decision_at,customer_decision,job_cancellation_events(event_type,customer_visible_message,occurred_at)",
    )
    .eq("job_id", id)
    .order("requested_at", { ascending: false });
  const media = await Promise.all(
    (job.job_media || []).map(async (item) => {
      const { data } = await supabase.storage
        .from("job-media")
        .createSignedUrl(item.storage_path, 300);
      return { ...item, url: data?.signedUrl };
    }),
  );
  return (
    <RoleShell role="customer">
      <Link href="/customer" className="text-sm font-bold text-slate">
        ← All requests
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{job.reference}</p>
          <h1 className="mt-2 text-4xl font-black">
            {job.service === "move" ? "Move It" : "Remove It"} request
          </h1>
        </div>
        <span className="rounded-full bg-orange/10 px-4 py-2 text-sm font-black capitalize text-orange">
          {statusForCustomer(job.status).label}
        </span>
      </div>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {query.accepted && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Quote accepted. No payment has been collected.
        </p>
      )}
      {query.completion_response && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Your completion response was recorded. No payment or payout was
          triggered.
        </p>
      )}
      {query.incident_reported && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-900">
          Your report was recorded for MUBER review. If anyone is in immediate
          danger, call 911.
        </p>
      )}
      {query.information_sent && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Your response was sent. MUBER will continue reviewing your request.
        </p>
      )}
      {query.cancellation_requested && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-900">
          Your cancellation request is awaiting MUBER review. Your job remains
          active until a decision is recorded. No fee, payment, or refund was
          processed.
        </p>
      )}
      {query.cancellation_withdrawn && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Your cancellation request was withdrawn. The job was not canceled.
        </p>
      )}
      <section className="card mt-8">
        <p className="eyebrow">Cancellation</p>
        <h2 className="mt-2 text-2xl font-black">Cancellation requests</h2>
        {!cancellationRequests?.some((item) =>
          ["requested", "under_review"].includes(item.status),
        ) &&
          !["completed", "closed", "cancelled"].includes(job.status) && (
            <form action={requestCancellation} className="mt-5 grid gap-3">
              <input type="hidden" name="job" value={job.id} />
              <label className="font-bold">
                Reason
                <select
                  name="reason"
                  required
                  className="mt-1 block w-full rounded-xl border p-3 font-normal"
                >
                  <option value="">Choose a reason</option>
                  <option value="plans_changed">Plans changed</option>
                  <option value="schedule_changed">Schedule changed</option>
                  <option value="service_no_longer_needed">
                    Service no longer needed
                  </option>
                  <option value="duplicate_request">Duplicate request</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="font-bold">
                Optional note
                <textarea
                  name="note"
                  maxLength={2000}
                  placeholder="Add helpful context. A note of at least 10 characters is required when choosing Other."
                  className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"
                />
              </label>
              <button className="rounded-xl border border-red-300 px-5 py-3 font-bold text-red-700">
                Request cancellation review
              </button>
            </form>
          )}
        <div className="mt-5 grid gap-3">
          {(cancellationRequests || []).map((item) => (
            <article key={item.id} className="rounded-2xl border p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <strong className="capitalize">
                  {item.reason.replaceAll("_", " ")}
                </strong>
                <span className="text-xs font-bold uppercase">
                  {item.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate">
                Requested {new Date(item.requested_at).toLocaleString()}
              </p>
              {item.customer_note && (
                <p className="mt-2 whitespace-pre-wrap">{item.customer_note}</p>
              )}
              {item.customer_decision && (
                <p className="mt-3 rounded-xl bg-warm p-3">
                  {item.customer_decision}
                </p>
              )}
              {["requested", "under_review"].includes(item.status) && (
                <form action={withdrawCancellation} className="mt-4">
                  <input type="hidden" name="job" value={job.id} />
                  <input type="hidden" name="request" value={item.id} />
                  <button className="rounded-xl border px-4 py-2 font-bold">
                    Withdraw request
                  </button>
                </form>
              )}
            </article>
          ))}
          {!cancellationRequests?.length && (
            <p className="text-sm text-slate">No cancellation requests.</p>
          )}
        </div>
      </section>
      {Boolean(informationRequests?.length) && (
        <section className="card mt-8">
          <p className="eyebrow">Information requests</p>
          <h2 className="mt-2 text-2xl font-black">Messages from MUBER</h2>
          <div className="mt-5 grid gap-4">
            {informationRequests?.map((item) => (
              <article key={item.id} className="rounded-2xl border p-5">
                <div className="flex justify-between gap-3">
                  <strong>{item.prompt}</strong>
                  <span className="text-xs font-bold uppercase">
                    {item.status}
                  </span>
                </div>
                {item.job_information_responses?.map((response) => (
                  <p
                    key={response.created_at}
                    className="mt-3 rounded-xl bg-warm p-3"
                  >
                    <strong>Your response:</strong> {response.response}
                  </p>
                ))}
                {item.status === "open" && (
                  <form
                    action={respondToInformationRequest}
                    className="mt-4 grid gap-3"
                  >
                    <input type="hidden" name="job" value={job.id} />
                    <input type="hidden" name="request" value={item.id} />
                    <textarea
                      name="response"
                      required
                      minLength={10}
                      maxLength={5000}
                      placeholder="Provide the requested details"
                      className="min-h-28 rounded-xl border p-3"
                    />
                    <button className="btn-primary">Send response</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      {completion && (
        <section className="card mt-8">
          <p className="eyebrow">Completion review</p>
          <h2 className="mt-2 text-2xl font-black">Service completion</h2>
          <p className="mt-4 whitespace-pre-wrap">
            {completion.customer_review_message || completion.customer_summary}
          </p>
          <p className="mt-3 text-sm text-slate">
            Reported complete{" "}
            {new Date(completion.completion_at).toLocaleString()}. Payment has
            not been collected in MUBER.
          </p>
          {Boolean(completionMedia?.length) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {completionMedia?.map((media) => (
                <a
                  key={media.id}
                  href={`/api/completion-media/${media.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border px-3 py-2 text-sm font-bold"
                >
                  View {media.purpose.replaceAll("_", " ")}
                </a>
              ))}
            </div>
          )}
          {completion.customer_confirmation_status === "requested" && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <form action={respondToCompletion}>
                <input type="hidden" name="job" value={job.id} />
                <input type="hidden" name="submission" value={completion.id} />
                <input type="hidden" name="response" value="confirm" />
                <button className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">
                  Confirm completion
                </button>
              </form>
              <form action={respondToCompletion} className="grid gap-2">
                <input type="hidden" name="job" value={job.id} />
                <input type="hidden" name="submission" value={completion.id} />
                <textarea
                  name="note"
                  required
                  minLength={10}
                  placeholder="Tell MUBER what needs attention"
                  className="min-h-20 rounded-xl border p-3"
                />
                <button
                  name="response"
                  value="report_problem"
                  className="rounded-xl border border-red-300 px-5 py-3 font-bold text-red-700"
                >
                  Report a problem
                </button>
              </form>
            </div>
          )}
          {completion.customer_confirmation_status === "confirmed" && (
            <p className="mt-5 font-bold text-emerald-700">
              You confirmed completion.
            </p>
          )}
          {completion.customer_confirmation_status === "problem_reported" && (
            <p className="mt-5 font-bold text-red-700">
              Your concern is under MUBER review.
            </p>
          )}
        </section>
      )}
      {Boolean(quotes?.length) && (
        <section className="card mt-8">
          <h2 className="text-xl font-black">Your quote</h2>
          {(quotes as CustomerQuote[] | null)?.map((quote) => (
            <article key={quote.id} className="mt-5 rounded-2xl bg-warm p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-orange">
                    VERSION {quote.version}
                  </p>
                  <p className="mt-1 text-3xl font-black">
                    ${(quote.total_cents / 100).toFixed(2)}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase">
                  {quote.status}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap">{quote.customer_scope}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt>Service</dt>
                  <dd className="font-bold">
                    ${(quote.service_subtotal_cents / 100).toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt>Disposal</dt>
                  <dd className="font-bold">
                    ${(quote.disposal_cents / 100).toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt>Travel</dt>
                  <dd className="font-bold">
                    ${(quote.travel_cents / 100).toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt>Other</dt>
                  <dd className="font-bold">
                    ${(quote.other_cents / 100).toFixed(2)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-slate">
                Expires {new Date(quote.expires_at).toLocaleString()}. Accepting
                confirms the quote only; payment is not collected.
              </p>
              {quote.status === "sent" && (
                <form action={acceptQuote} className="mt-5">
                  <input type="hidden" name="job" value={job.id} />
                  <input type="hidden" name="quote" value={quote.id} />
                  <button className="btn-primary">Accept quote</button>
                </form>
              )}
            </article>
          ))}
        </section>
      )}
      <section className="card mt-8">
        <p className="eyebrow">Safety and service support</p>
        <h2 className="mt-2 text-2xl font-black">
          Report an incident or concern
        </h2>
        <p className="mt-3 text-sm text-slate">
          This creates an immutable report for review. It does not determine
          fault, liability, a refund, or an insurance outcome.
        </p>
        <form
          action={reportIncident}
          className="mt-5 grid gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="job" value={job.id} />
          <select name="category" required className="rounded-xl border p-3">
            <option value="item_damage">Item damage</option>
            <option value="property_damage">Property damage</option>
            <option value="missing_item">Missing item</option>
            <option value="customer_injury">Injury</option>
            <option value="provider_conduct">Provider conduct</option>
            <option value="unsafe_location">Unsafe condition</option>
            <option value="other">Other concern</option>
          </select>
          <select name="severity" required className="rounded-xl border p-3">
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            name="occurred_at"
            type="datetime-local"
            required
            className="rounded-xl border p-3"
          />
          <input
            name="safety_action"
            placeholder="Immediate safety action taken (optional)"
            className="rounded-xl border p-3"
          />
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={10000}
            placeholder="Describe what happened and what was affected"
            className="min-h-28 rounded-xl border p-3 md:col-span-2"
          />
          <fieldset className="flex flex-wrap gap-4 text-sm md:col-span-2">
            {[
              ["injury", "Injury"],
              ["emergency_services", "Emergency services"],
              ["damage", "Damage"],
              ["missing_item", "Missing item"],
              ["hazard", "Hazard"],
            ].map(([name, label]) => (
              <label key={name} className="flex gap-2">
                <input type="checkbox" name={name} /> {label}
              </label>
            ))}
          </fieldset>
          <button className="btn-primary md:col-span-2">Submit report</button>
        </form>
      </section>
      {Boolean(incidents?.length) && (
        <section className="card mt-8">
          <p className="eyebrow">Reported concerns</p>
          <h2 className="mt-2 text-2xl font-black">Incident history</h2>
          <div className="mt-5 grid gap-4">
            {incidents?.map((incident) => (
              <article key={incident.id} className="rounded-2xl border p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="capitalize">
                    {incident.category.replaceAll("_", " ")}
                  </strong>
                  <span className="text-xs font-bold uppercase">
                    {incident.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate">
                  {incident.customer_visible_summary ||
                    "Awaiting MUBER review."}
                </p>
                <Link
                  href={`/incidents/${incident.id}`}
                  className="mt-3 inline-flex rounded-xl border px-3 py-2 text-sm font-bold"
                >
                  View incident timeline
                </Link>
                <div className="mt-3 flex flex-wrap gap-2">
                  {incident.incident_evidence?.map((evidence) => (
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
                {!["resolved", "closed", "void"].includes(incident.status) && (
                  <IncidentEvidenceUpload incident={incident.id} />
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-xl font-black">Submitted scope</h2>
          <p className="mt-4 whitespace-pre-wrap text-slate">
            {job.description || "No additional description"}
          </p>
          <dl className="mt-6 space-y-4">
            {job.job_stops
              .sort((a, b) => a.stop_order - b.stop_order)
              .map((stop) => (
                <div key={stop.stop_order}>
                  <dt className="text-xs font-black uppercase text-slate">
                    {stop.stop_type}
                  </dt>
                  <dd className="mt-1 font-bold">
                    {
                      (stop.addresses as unknown as { line1?: string } | null)
                        ?.line1
                    }
                  </dd>
                </div>
              ))}
          </dl>
          <p className="mt-6 text-sm text-slate">
            Requested:{" "}
            {job.preferred_start
              ? new Date(job.preferred_start).toLocaleDateString()
              : "Pending"}{" "}
            · {job.time_window || "Flexible"}
          </p>
        </section>
        <section className="card">
          <h2 className="text-xl font-black">Status timeline</h2>
          <ol className="mt-5 space-y-4">
            {job.job_status_events.map((event) => (
              <li
                key={event.occurred_at}
                className="border-l-2 border-success pl-4"
              >
                <p className="font-bold capitalize">
                  {event.status.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-slate">
                  {new Date(event.occurred_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-2xl bg-warm p-4 text-sm leading-6">
            MUBER reviews your request before a quote is offered or a provider
            is assigned.
          </p>
        </section>
      </div>
      {media.length > 0 && (
        <section className="card mt-5">
          <h2 className="text-xl font-black">Photos</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {media.map((item) =>
              item.url ? (
                <img
                  key={item.id}
                  src={item.url}
                  alt="Customer job upload"
                  className="aspect-square rounded-2xl object-cover"
                />
              ) : null,
            )}
          </div>
        </section>
      )}
      <Link href="/support" className="btn-ghost mt-6">
        Contact support
      </Link>
    </RoleShell>
  );
}
