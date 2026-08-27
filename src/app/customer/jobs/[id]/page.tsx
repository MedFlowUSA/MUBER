/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { statusForCustomer } from "@/lib/job-status";
import { acceptQuote } from "./actions";
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
  searchParams: Promise<{ error?: string; accepted?: string }>;
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
