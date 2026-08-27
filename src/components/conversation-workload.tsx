import Link from "next/link";
export function ConversationWorkload({
  counts,
}: {
  counts: {
    unread_threads?: number;
    needs_reply_threads?: number;
    overdue_reply_threads?: number;
  } | null;
}) {
  const unread = Number(counts?.unread_threads || 0),
    reply = Number(counts?.needs_reply_threads || 0),
    overdue = Number(counts?.overdue_reply_threads || 0);
  return (
    <section
      className="mt-6 grid gap-3 sm:grid-cols-3"
      aria-label="Conversation workload"
    >
      <Link
        href="/messages?view=unread"
        className="rounded-2xl border bg-white p-4"
      >
        <span className="text-sm font-bold text-slate">
          Unread conversations
        </span>
        <strong className="mt-2 block text-3xl">{unread}</strong>
      </Link>
      <Link
        href="/messages?view=needs_reply"
        className="rounded-2xl border bg-white p-4"
      >
        <span className="text-sm font-bold text-slate">Needs your reply</span>
        <strong className="mt-2 block text-3xl">{reply}</strong>
      </Link>
      <Link
        href="/messages?view=needs_reply"
        className={`rounded-2xl border p-4 ${overdue ? "border-amber-300 bg-amber-50" : "bg-white"}`}
      >
        <span className="text-sm font-bold text-slate">Response overdue</span>
        <strong className="mt-2 block text-3xl">{overdue}</strong>
      </Link>
    </section>
  );
}
