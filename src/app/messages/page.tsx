import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { markConversationRead, sendJobMessage } from "./actions";
import { ConversationAttachmentUpload } from "@/components/conversation-attachment-upload";
import { parseConversationQuery } from "@/lib/queue-query";

type PortalRole = "customer" | "provider" | "crew" | "dispatch" | "admin";
type MessageJob = {
  job_id: string;
  reference: string;
  service: string;
  status: string;
  last_message_at: string | null;
  last_preview: string | null;
  unread_count: number;
  total_count: number;
  needs_reply: boolean;
  waiting_hours: number;
};
type Message = {
  id: string;
  channel: string;
  body: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
  total_count: number;
};
type Attachment = {
  id: string;
  message_id: string;
  mime_type: string;
  byte_size: number;
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
  searchParams: Promise<{
    job?: string;
    error?: string;
    sent?: string;
    view?: string;
    page?: string;
    message_page?: string;
  }>;
}) {
  const query = await searchParams;
  const filters = parseConversationQuery(query);
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
  const { data: jobs } = await supabase.rpc("get_message_response_queue", {
    p_page: filters.page,
    p_page_size: filters.pageSize,
    p_view: filters.view,
  });
  const available = (jobs || []) as MessageJob[];
  const pages = Math.max(
    1,
    Math.ceil(Number(available[0]?.total_count || 0) / filters.pageSize),
  );
  const selected =
    available.find((item) => item.job_id === query.job) || available[0];
  const [messageResult, attachmentResult] = selected
    ? await Promise.all([
        supabase.rpc("get_job_messages_page", {
          p_job: selected.job_id,
          p_page: filters.messagePage,
          p_page_size: filters.messagePageSize,
        }),
        supabase.rpc("get_job_message_attachments_page", {
          p_job: selected.job_id,
          p_page: filters.messagePage,
          p_page_size: filters.messagePageSize,
        }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  const { data: messages, error } = messageResult;
  const attachments = (attachmentResult.data || []) as Attachment[];
  const messageRows = (messages || []) as Message[];
  const messagePages = Math.max(
    1,
    Math.ceil(
      Number(messageRows[0]?.total_count || 0) / filters.messagePageSize,
    ),
  );
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
      <form className="mt-6 flex gap-3 rounded-2xl border bg-white p-4">
        <select
          name="view"
          defaultValue={filters.view}
          className="min-h-12 flex-1 rounded-xl border p-3"
        >
          <option value="all">All conversations</option>
          <option value="unread">Unread only</option>
          <option value="needs_reply">Needs my reply</option>
        </select>
        <button className="btn-primary">Apply</button>
      </form>
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
              {Number(item.unread_count) > 0 && (
                <span className="ml-2 rounded-full bg-orange px-2 py-1 text-xs font-black text-white">
                  {item.unread_count} unread
                </span>
              )}
              {item.needs_reply && (
                <span className="mt-2 block text-xs font-black text-orange">
                  Reply needed · waiting {item.waiting_hours}h
                </span>
              )}
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
              {Number(selected.unread_count) > 0 && (
                <form action={markConversationRead}>
                  <input type="hidden" name="job" value={selected.job_id} />
                  <button className="rounded-xl border px-3 py-2 text-sm font-bold">
                    Mark read
                  </button>
                </form>
              )}
              <span className="text-xs font-bold uppercase">
                {selected.status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="grid max-h-[32rem] gap-3 overflow-y-auto py-5">
              {messageRows.map((message) => (
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
                  {attachments
                    .filter((item) => item.message_id === message.id)
                    .map((item) => (
                      <a
                        key={item.id}
                        href={`/api/conversation-attachments/${item.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 block rounded-xl border bg-white px-3 py-2 text-sm font-bold"
                      >
                        View private{" "}
                        {item.mime_type === "application/pdf" ? "PDF" : "image"}{" "}
                        · {(item.byte_size / 1048576).toFixed(1)} MB
                      </a>
                    ))}
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
            <div className="mb-5 flex items-center justify-between border-t pt-4">
              <Link
                className={`text-sm font-bold ${filters.messagePage >= messagePages ? "pointer-events-none opacity-40" : ""}`}
                href={`/messages?job=${selected.job_id}&view=${filters.view}&page=${filters.page}&message_page=${Math.min(messagePages, filters.messagePage + 1)}`}
              >
                Older
              </Link>
              <span className="text-xs font-bold">
                Messages {filters.messagePage} / {messagePages}
              </span>
              <Link
                className={`text-sm font-bold ${filters.messagePage <= 1 ? "pointer-events-none opacity-40" : ""}`}
                href={`/messages?job=${selected.job_id}&view=${filters.view}&page=${filters.page}&message_page=${Math.max(1, filters.messagePage - 1)}`}
              >
                Newer
              </Link>
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
            <ConversationAttachmentUpload
              job={selected.job_id}
              channel={channel}
              operational={operational}
            />
          </section>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Link
          className={`btn-ghost ${filters.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          href={`/messages?view=${filters.view}&page=${Math.max(1, filters.page - 1)}`}
        >
          Previous
        </Link>
        <span className="text-sm font-bold">
          Page {filters.page} of {pages}
        </span>
        <Link
          className={`btn-ghost ${filters.page >= pages ? "pointer-events-none opacity-50" : ""}`}
          href={`/messages?view=${filters.view}&page=${Math.min(pages, filters.page + 1)}`}
        >
          Next
        </Link>
      </div>
    </RoleShell>
  );
}
