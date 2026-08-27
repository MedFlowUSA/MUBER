/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { dispatchCommands } from "@/lib/job-status";
import { saveJobReview, transitionJob } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    updated?: string;
    reviewed?: string;
  }>;
};
const first = <T,>(value: T | T[] | null) =>
  Array.isArray(value) ? value[0] : value;
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
      "id,reference,service,status,preferred_start,time_window,description,created_at,customers(full_name,email,phone),job_stops(stop_order,stop_type,addresses(line1,line2,city,region,postal_code,access_notes)),job_items(category,description,quantity,heavy),job_media(id,storage_path,mime_type),internal_job_reviews(complexity,risk_flags,required_crew_size,required_vehicle_class,credential_requirements,internal_notes),job_operational_events(from_status,to_status,command,reason,occurred_at)",
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
      {(query.updated || query.reviewed) && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Operational record updated and audited.
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
