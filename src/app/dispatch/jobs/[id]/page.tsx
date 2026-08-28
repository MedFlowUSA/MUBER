/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { dispatchCommands } from "@/lib/job-status";
import {
  createProviderOffer,
  createQuote,
  requestCustomerInformation,
  reviewCancellation,
  saveJobReview,
  sendQuote,
  transitionJob,
} from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    updated?: string;
    reviewed?: string;
    quote?: string;
    sent?: string;
    offered?: string;
    information_requested?: string;
    cancellation_reviewed?: string;
  }>;
};
const first = <T,>(value: T | T[] | null) =>
  Array.isArray(value) ? value[0] : value;
type EligibilityRow = {
  provider_company_id: string;
  legal_name: string;
  eligible: boolean;
  reasons: string[];
  qualifications: string[];
  vehicle_fit: boolean;
  crew_fit: boolean;
  credential_fit: boolean;
};
type ScheduleRow = {
  provider_company_id: string;
  schedule_eligible: boolean;
  schedule_reason: string | null;
};
export default async function DispatchJob({ params, searchParams }: Props) {
  const { id } = await params,
    query = await searchParams;
  const { supabase } = await requireOperationalRole(
    ["dispatcher", "super_admin"],
    `/dispatch/jobs/${id}`,
  );
  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id,reference,service,status,preferred_start,time_window,description,created_at,customers(full_name,email,phone),job_stops(stop_order,stop_type,addresses(line1,line2,city,region,postal_code,access_notes)),job_items(category,description,quantity,heavy),job_media(id,storage_path,mime_type),internal_job_reviews(complexity,risk_flags,required_crew_size,required_vehicle_class,credential_requirements,internal_notes),job_operational_events(from_status,to_status,command,reason,occurred_at),quote_versions(id,version,service_subtotal_cents,disposal_cents,travel_cents,other_cents,total_cents,currency,customer_scope,internal_notes,estimated_provider_compensation_cents,expires_at,status,created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!job) notFound();
  const media = await Promise.all(
    (job.job_media || []).map(async (item) => ({
      ...item,
      url: (
        await supabase.storage
          .from("job-media")
          .createSignedUrl(item.storage_path, 300)
      ).data?.signedUrl,
    })),
  );
  const review = job.internal_job_reviews?.[0],
    commands = dispatchCommands[job.status] || [];
  const customer = first(job.customers);
  const { data: informationRequests } = await supabase
    .from("job_information_requests")
    .select(
      "id,prompt,internal_context,status,created_at,job_information_responses(response,created_at)",
    )
    .eq("job_id", job.id)
    .order("created_at", { ascending: false });
  const { data: cancellationRequests } = await supabase
    .from("job_cancellation_requests")
    .select(
      "id,reason,customer_note,status,requested_at,job_state_at_request,assignment_state_at_request,scheduled_start_at_request,customer_decision,internal_decision_reason,job_cancellation_events(event_type,customer_visible_message,internal_reason,occurred_at)",
    )
    .eq("job_id", job.id)
    .order("requested_at", { ascending: false });
  const [{ data: baseEligibility }, { data: scheduleEligibility }] =
    job.status === "ready_for_matching"
      ? await Promise.all([
          supabase.rpc("eligible_providers_for_job", { p_job: job.id }),
          supabase.rpc("provider_schedule_eligibility_for_job", {
            p_job: job.id,
          }),
        ])
      : [{ data: null }, { data: null }];
  const eligibility = ((baseEligibility || []) as EligibilityRow[]).map(
    (provider) => {
      const schedule = (scheduleEligibility as ScheduleRow[] | null)?.find(
        (item: ScheduleRow) =>
          item.provider_company_id === provider.provider_company_id,
      );
      return {
        ...provider,
        eligible: provider.eligible && (schedule?.schedule_eligible ?? true),
        reasons:
          schedule?.schedule_eligible === false && schedule.schedule_reason
            ? [...provider.reasons, schedule.schedule_reason]
            : provider.reasons,
        schedule_fit: schedule?.schedule_eligible ?? true,
      };
    },
  );
  return (
    <RoleShell role="dispatch">
      <Link href="/dispatch" className="text-sm font-bold text-orange-600">
        ← Dispatch queue
      </Link>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {(query.updated ||
        query.reviewed ||
        query.quote ||
        query.sent ||
        query.offered ||
        query.cancellation_reviewed) && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Operational record updated and audited.
        </p>
      )}
      {query.information_requested && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Customer information request sent and audited.
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-between gap-4">
        <div>
          <p className="eyebrow">{job.reference}</p>
          <h1 className="mt-2 text-4xl font-black">
            {job.service === "move" ? "Move It" : "Remove It"} review
          </h1>
        </div>
        <span className="rounded-full bg-orange/10 px-4 py-2 text-sm font-black uppercase text-orange">
          {job.status.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <section className="card">
          <h2 className="text-xl font-black">Customer scope</h2>
          <p className="mt-3 text-sm text-slate">
            {customer?.full_name} · {customer?.email} · {customer?.phone}
          </p>
          <p className="mt-5 whitespace-pre-wrap">
            {job.description || "No additional description"}
          </p>
          <div className="mt-5 space-y-3">
            {job.job_stops
              .sort((a, b) => a.stop_order - b.stop_order)
              .map((stop) => (
                <div key={stop.stop_order}>
                  <p className="text-xs font-black uppercase text-slate">
                    {stop.stop_type}
                  </p>
                  <p className="font-bold">
                    {first(stop.addresses)?.line1},{" "}
                    {first(stop.addresses)?.city},{" "}
                    {first(stop.addresses)?.region}{" "}
                    {first(stop.addresses)?.postal_code}
                  </p>
                </div>
              ))}
          </div>
          {media.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-3">
              {media.map((item) =>
                item.url ? (
                  <img
                    key={item.id}
                    src={item.url}
                    alt="Customer job evidence"
                    className="aspect-square rounded-xl object-cover"
                  />
                ) : null,
              )}
            </div>
          )}
        </section>
        <section className="card">
          <h2 className="text-xl font-black">Internal review</h2>
          <p className="mt-2 text-sm text-red-700">
            Internal fields never appear in the customer timeline.
          </p>
          <form action={saveJobReview} className="mt-5 grid gap-3">
            <input type="hidden" name="job" value={job.id} />
            <select
              name="complexity"
              defaultValue={review?.complexity || "standard"}
              className="rounded-xl border px-4 py-3"
            >
              <option value="standard">Standard</option>
              <option value="complex">Complex</option>
              <option value="high_risk">High risk</option>
            </select>
            <input
              name="risk_flags"
              defaultValue={review?.risk_flags?.join(", ")}
              placeholder="Risk flags, comma separated"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="crew_size"
              type="number"
              min="1"
              max="20"
              defaultValue={review?.required_crew_size || 2}
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="vehicle"
              defaultValue={review?.required_vehicle_class || ""}
              placeholder="Required vehicle class"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="credentials"
              defaultValue={review?.credential_requirements?.join(", ") || ""}
              placeholder="Required credentials, comma separated"
              className="rounded-xl border px-4 py-3"
            />
            <textarea
              name="notes"
              defaultValue={review?.internal_notes || ""}
              placeholder="Internal notes"
              className="min-h-28 rounded-xl border px-4 py-3"
            />
            <button className="rounded-xl border border-orange-600 px-5 py-3 font-bold text-orange-700">
              Save internal review
            </button>
          </form>
        </section>
      </div>
      {job.status === "quote_preparation" && (
        <section className="card mt-5">
          <h2 className="text-xl font-black">Prepare quote</h2>
          <p className="mt-2 text-sm text-slate">
            Amounts are converted to integer cents and totaled by the database.
            Creating a version does not send it.
          </p>
          <form action={createQuote} className="mt-5 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="job" value={job.id} />
            {[
              ["service", "Service subtotal"],
              ["disposal", "Disposal estimate"],
              ["travel", "Travel"],
              ["other", "Other approved charges"],
              ["provider", "Internal provider compensation estimate"],
            ].map(([name, label]) => (
              <label key={name} className="text-sm font-bold">
                {label}
                <input
                  name={name}
                  required={name !== "provider"}
                  defaultValue="0.00"
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl border px-4 py-3 font-normal"
                />
              </label>
            ))}
            <label className="text-sm font-bold">
              Expires
              <input
                name="expires"
                type="datetime-local"
                required
                className="mt-1 w-full rounded-xl border px-4 py-3 font-normal"
              />
            </label>
            <textarea
              name="scope"
              required
              minLength={10}
              placeholder="Customer-facing scope"
              className="min-h-28 rounded-xl border px-4 py-3 md:col-span-2"
            />
            <textarea
              name="internal_notes"
              placeholder="Internal calculation notes"
              className="min-h-24 rounded-xl border px-4 py-3 md:col-span-2"
            />
            <button className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white md:col-span-2">
              Create quote version
            </button>
          </form>
        </section>
      )}
      {Boolean(job.quote_versions?.length) && (
        <section className="card mt-5">
          <h2 className="text-xl font-black">Quote history</h2>
          <div className="mt-5 grid gap-3">
            {job.quote_versions
              .sort((a, b) => b.version - a.version)
              .map((quote) => (
                <article key={quote.id} className="rounded-2xl border p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-black">
                        Version {quote.version} · $
                        {(quote.total_cents / 100).toFixed(2)}
                      </h3>
                      <p className="mt-1 text-sm text-slate">
                        Expires {new Date(quote.expires_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs font-bold uppercase">
                      {quote.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">{quote.customer_scope}</p>
                  {quote.internal_notes && (
                    <p className="mt-2 text-sm text-red-800">
                      Internal: {quote.internal_notes}
                    </p>
                  )}
                  {quote.status === "ready_for_review" &&
                    job.status === "quote_preparation" && (
                      <form action={sendQuote} className="mt-4">
                        <input type="hidden" name="job" value={job.id} />
                        <input type="hidden" name="quote" value={quote.id} />
                        <button className="rounded-xl bg-navy px-5 py-3 font-bold text-white">
                          Send version {quote.version} to customer
                        </button>
                      </form>
                    )}
                </article>
              ))}
          </div>
        </section>
      )}
      {job.status === "ready_for_matching" && (
        <section className="card mt-5">
          <h2 className="text-xl font-black">Manual provider eligibility</h2>
          <p className="mt-2 text-sm text-slate">
            Approval, service, territory setup, availability, vehicle, crew,
            disposal capability, and verified unexpired credentials are checked.
            No automated ranking is used. Territory configuration is not route
            validation, so dispatch must confirm the job is inside the stated
            service area before sending an offer.
          </p>
          <div className="mt-5 grid gap-3">
            {(eligibility || []).map(
              (provider: {
                provider_company_id: string;
                legal_name: string;
                eligible: boolean;
                reasons: string[];
                qualifications: string[];
                vehicle_fit: boolean;
                crew_fit: boolean;
                credential_fit: boolean;
                schedule_fit: boolean;
              }) => (
                <article
                  key={provider.provider_company_id}
                  className={`rounded-2xl border p-5 ${provider.eligible ? "border-emerald-300" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="font-black">{provider.legal_name}</h3>
                    <span
                      className={`text-xs font-bold uppercase ${provider.eligible ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {provider.eligible ? "eligible" : "excluded"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate">
                    Vehicle: {provider.vehicle_fit ? "fit" : "blocked"} · Crew:{" "}
                    {provider.crew_fit ? "fit" : "blocked"} · Credentials:{" "}
                    {provider.credential_fit ? "verified" : "blocked"}
                    {" · "}Schedule:{" "}
                    {provider.schedule_fit ? "open" : "blocked"}
                  </p>
                  {provider.qualifications.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 text-sm text-emerald-800">
                      {provider.qualifications.map((qualification) => (
                        <li key={qualification}>{qualification}</li>
                      ))}
                    </ul>
                  )}
                  {provider.reasons.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 text-sm text-red-700">
                      {provider.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                  {!provider.eligible && (
                    <p className="mt-3 text-xs font-semibold text-slate">
                      Exclusions cannot be overridden here. Correct the provider
                      record or lawfully reclassify the job with an audited
                      review.
                    </p>
                  )}
                  {provider.eligible && (
                    <form
                      action={createProviderOffer}
                      className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <input type="hidden" name="job" value={job.id} />
                      <input
                        type="hidden"
                        name="provider"
                        value={provider.provider_company_id}
                      />
                      <label className="text-sm font-bold">
                        Estimated minutes
                        <input
                          name="duration"
                          type="number"
                          min="15"
                          max="1440"
                          required
                          defaultValue="120"
                          className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                        />
                      </label>
                      <label className="text-sm font-bold">
                        Offer expires
                        <input
                          name="expires"
                          type="datetime-local"
                          required
                          className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                        />
                      </label>
                      <button className="self-end rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">
                        Send exclusive offer
                      </button>
                    </form>
                  )}
                </article>
              ),
            )}
            {!eligibility.length && (
              <p className="text-sm text-slate">
                No approved providers are configured yet.
              </p>
            )}
          </div>
        </section>
      )}
      <section className="card mt-5">
        <h2 className="text-xl font-black">Cancellation review</h2>
        <p className="mt-2 text-sm text-slate">
          A request does not cancel the job. Approval uses the audited job state
          command and records no payment, fee, or refund action.
        </p>
        <div className="mt-5 grid gap-4">
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
                Requested {new Date(item.requested_at).toLocaleString()} · job
                was {item.job_state_at_request.replaceAll("_", " ")} ·
                assignment was{" "}
                {item.assignment_state_at_request?.replaceAll("_", " ") ||
                  "unassigned"}
              </p>
              {item.scheduled_start_at_request && (
                <p className="mt-1 text-sm text-slate">
                  Scheduled start:{" "}
                  {new Date(item.scheduled_start_at_request).toLocaleString()}
                </p>
              )}
              {item.customer_note && (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-warm p-3">
                  <strong>Customer note:</strong> {item.customer_note}
                </p>
              )}
              {item.internal_decision_reason && (
                <p className="mt-3 text-sm text-red-800">
                  <strong>Internal decision:</strong>{" "}
                  {item.internal_decision_reason}
                </p>
              )}
              {item.customer_decision && (
                <p className="mt-2 text-sm">
                  <strong>Customer message:</strong> {item.customer_decision}
                </p>
              )}
              {item.status === "requested" && (
                <form action={reviewCancellation} className="mt-4">
                  <input type="hidden" name="job" value={job.id} />
                  <input type="hidden" name="request" value={item.id} />
                  <input
                    type="hidden"
                    name="review_action"
                    value="start_review"
                  />
                  <button className="rounded-xl border px-4 py-2 font-bold">
                    Start review
                  </button>
                </form>
              )}
              {["requested", "under_review"].includes(item.status) && (
                <form action={reviewCancellation} className="mt-4 grid gap-3">
                  <input type="hidden" name="job" value={job.id} />
                  <input type="hidden" name="request" value={item.id} />
                  <textarea
                    name="customer_message"
                    required
                    minLength={10}
                    maxLength={2000}
                    placeholder="Customer-visible decision explanation"
                    className="min-h-20 rounded-xl border p-3"
                  />
                  <textarea
                    name="internal_reason"
                    required
                    minLength={10}
                    maxLength={4000}
                    placeholder="Specific internal decision reason"
                    className="min-h-20 rounded-xl border p-3"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      name="review_action"
                      value="approve"
                      className="rounded-xl bg-red-700 px-4 py-3 font-bold text-white"
                    >
                      Approve cancellation
                    </button>
                    <button
                      name="review_action"
                      value="decline"
                      className="rounded-xl border px-4 py-3 font-bold"
                    >
                      Decline request
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
          {!cancellationRequests?.length && (
            <p className="text-sm text-slate">
              No cancellation requests for this job.
            </p>
          )}
        </div>
      </section>
      <section className="card mt-5">
        <h2 className="text-xl font-black">Customer information requests</h2>
        {["submitted", "needs_review"].includes(job.status) && (
          <form action={requestCustomerInformation} className="mt-5 grid gap-3">
            <input type="hidden" name="job" value={job.id} />
            <textarea
              name="prompt"
              required
              minLength={10}
              maxLength={2000}
              placeholder="Specific question the customer will see"
              className="min-h-24 rounded-xl border p-3"
            />
            <textarea
              name="internal_context"
              maxLength={4000}
              placeholder="Internal context — never shown to the customer"
              className="min-h-20 rounded-xl border p-3"
            />
            <button className="btn-primary">Send information request</button>
          </form>
        )}
        <div className="mt-5 grid gap-3">
          {(informationRequests || []).map((item) => (
            <article key={item.id} className="rounded-xl bg-warm p-4">
              <div className="flex justify-between gap-3">
                <strong>{item.prompt}</strong>
                <span className="text-xs font-bold uppercase">
                  {item.status}
                </span>
              </div>
              {item.internal_context && (
                <p className="mt-2 text-sm text-slate">
                  <strong>Internal:</strong> {item.internal_context}
                </p>
              )}
              {item.job_information_responses?.map((response) => (
                <p
                  key={response.created_at}
                  className="mt-3 rounded-xl bg-white p-3"
                >
                  <strong>Customer response:</strong> {response.response}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>
      <section className="card mt-5">
        <h2 className="text-xl font-black">Permitted state commands</h2>
        <div className="mt-5 grid gap-3">
          {commands.map((command) => (
            <form
              action={transitionJob}
              key={command.command}
              className="grid gap-3 sm:grid-cols-[1fr_auto]"
            >
              <input type="hidden" name="job" value={job.id} />
              <input type="hidden" name="status" value={job.status} />
              <input
                name="reason"
                required={command.reason}
                minLength={command.reason ? 10 : undefined}
                placeholder={
                  command.reason
                    ? "Specific internal reason required"
                    : "Optional internal context"
                }
                className="rounded-xl border px-4 py-3"
              />
              <button
                name="command"
                value={command.command}
                className="rounded-xl bg-navy px-5 py-3 font-bold text-white"
              >
                {command.label}
              </button>
            </form>
          ))}
          {!commands.length && (
            <p className="text-sm text-slate">
              No manual dispatcher command is available from this state.
            </p>
          )}
        </div>
      </section>
      <section className="card mt-5">
        <h2 className="text-xl font-black">Immutable operational timeline</h2>
        <ol className="mt-5 space-y-4">
          {job.job_operational_events
            .sort(
              (a, b) =>
                new Date(b.occurred_at).getTime() -
                new Date(a.occurred_at).getTime(),
            )
            .map((event) => (
              <li
                key={event.occurred_at}
                className="border-l-2 border-orange pl-4"
              >
                <p className="font-bold">
                  {event.from_status.replaceAll("_", " ")} →{" "}
                  {event.to_status.replaceAll("_", " ")}
                </p>
                <p className="text-sm text-slate">
                  {event.command.replaceAll("_", " ")} ·{" "}
                  {new Date(event.occurred_at).toLocaleString()}
                </p>
                {event.reason && (
                  <p className="mt-1 text-sm text-red-800">
                    Internal: {event.reason}
                  </p>
                )}
              </li>
            ))}
          {!job.job_operational_events.length && (
            <p className="text-sm text-slate">
              No dispatcher transitions recorded yet.
            </p>
          )}
        </ol>
      </section>
    </RoleShell>
  );
}
