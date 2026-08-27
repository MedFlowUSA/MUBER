import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendJobMessage } from "./actions";

type PortalRole = "customer" | "provider" | "crew" | "dispatch" | "admin";
type MessageJob = {
  job_id: string;
  reference: string;
  service: string;
  status: string;
  last_message_at: string | null;
};
type Message = {
  id: string;
  channel: string;
  body: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
};
const shellFor = (role: string): PortalRole =>
  role === "customer"
    ? "customer"
    : role.startsWith("provider_")
      ? "provider"
      : role.startsWith("crew_")
        ? "crew"
        : role === "dispatcher"
          ? "dispatch"
          : "admin";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; error?: string; sent?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/messages");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/auth/login");
  const { data: jobs } = await supabase.rpc("get_message_jobs");
  const available = (jobs || []) as MessageJob[];
  const selected =
    available.find((item) => item.job_id === query.job) || available[0];
  const { data: messages, error } = selected
    ? await supabase.rpc("get_job_messages", {
        p_job: selected.job_id,
        p_limit: 200,
      })
    : { data: [], error: null };
  const role = String(profile.role);
  const operational = ["dispatcher", "super_admin"].includes(role);
  const channel =
    role === "customer"
      ? "customer_dispatch"
      : role.startsWith("provider_") || role.startsWith("crew_")
        ? "provider_dispatch"
        : "customer_dispatch";
  return (
    <RoleShell role={shellFor(role)}>
      <p className="eyebrow">Secure communications</p>
      <h1 className="mt-2 text-4xl font-black">Job conversations</h1>
      <p className="mt-3 text-slate">
        Messages are job-scoped, role-filtered, and retained in the operational
        audit trail.
      </p>
      {(query.error || error) && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error || error?.message}
        </p>
      )}
      {query.sent && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Message sent and audited.
        </p>
      )}
      <div className="mt-8 grid gap-5 lg:grid-cols-[260px_1fr]">
        <nav
          aria-label="Job conversations"
          className="grid content-start gap-2"
        >
          {available.map((item) => (
            <Link
              key={item.job_id}
              href={`/messages?job=${item.job_id}`}
              className={`rounded-2xl border p-4 ${selected?.job_id === item.job_id ? "bg-navy text-white" : "bg-white"}`}
            >
              <strong>{item.reference}</strong>
              <span className="mt-1 block text-xs uppercase">
                {item.service} · {item.status.replaceAll("_", " ")}
              </span>
            </Link>
          ))}
          {!available.length && (
            <p className="rounded-2xl border bg-white p-5 text-sm text-slate">
              No job conversations are available.
            </p>
          )}
        </nav>
        {selected && (
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-2 border-b pb-4">
              <h2 className="text-xl font-black">{selected.reference}</h2>
              <span className="text-xs font-bold uppercase">
                {selected.status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="grid max-h-[32rem] gap-3 overflow-y-auto py-5">
              {((messages || []) as Message[]).map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[90%] rounded-2xl p-4 ${message.sender_id === user.id ? "ml-auto bg-orange/10" : "bg-warm"}`}
                >
                  <div className="flex flex-wrap gap-2 text-xs font-bold uppercase text-slate">
                    <span>{message.sender_name}</span>
                    <span>·</span>
                    <span>{message.channel.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
                  <time className="mt-2 block text-xs text-slate">
                    {new Date(message.created_at).toLocaleString()}
                  </time>
                </article>
              ))}
              {!messages?.length && (
                <p className="text-sm text-slate">
                  No messages yet. Start the conversation below.
                </p>
              )}
            </div>
            <form action={sendJobMessage} className="grid gap-3 border-t pt-5">
              <input type="hidden" name="job" value={selected.job_id} />
              {operational ? (
                <label className="font-bold">
                  Audience
                  <select
                    name="channel"
                    className="mt-1 block w-full rounded-xl border p-3 font-normal"
                  >
                    <option value="customer_dispatch">
                      Customer and MUBER
                    </option>
                    <option value="provider_dispatch">
                      Contractor and MUBER
                    </option>
                    <option value="shared">Shared operational update</option>
                    <option value="internal">MUBER internal only</option>
                  </select>
                </label>
              ) : (
                <input type="hidden" name="channel" value={channel} />
              )}
              <textarea
                name="body"
                required
                maxLength={5000}
                className="min-h-28 rounded-xl border p-3"
                placeholder="Write a job-related message"
              />
              <button className="btn-primary">Send message</button>
            </form>
          </section>
        )}
      </div>
    </RoleShell>
  );
}
