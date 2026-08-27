import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { markRead } from "./actions";
import { parseNotificationQuery } from "@/lib/queue-query";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/notifications");
  const filters = parseNotificationQuery(await searchParams);
  let notificationQuery = supabase
    .from("in_app_notifications")
    .select("id,event_key,route,safe_preview,read_at,created_at", {
      count: "exact",
    });
  if (filters.view === "unread")
    notificationQuery = notificationQuery.is("read_at", null);
  const start = (filters.page - 1) * filters.pageSize;
  const { data: notifications, count } = await notificationQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + filters.pageSize - 1);
  const pages = Math.max(1, Math.ceil((count || 0) / filters.pageSize));
  const href = (page: number) =>
    `/notifications?view=${filters.view}&page=${page}`;
  return (
    <main className="min-h-screen bg-warm py-12">
      <div className="shell max-w-3xl">
        <Link href="/" className="text-sm font-bold text-orange-600">
          ← MUBER home
        </Link>
        <p className="eyebrow mt-6">Account activity</p>
        <h1 className="mt-2 text-4xl font-black">Notifications</h1>
        <form className="mt-6 flex gap-3 rounded-2xl border bg-white p-4">
          <select
            name="view"
            defaultValue={filters.view}
            className="min-h-12 flex-1 rounded-xl border p-3"
          >
            <option value="all">All notifications</option>
            <option value="unread">Unread only</option>
          </select>
          <button className="btn-primary">Apply</button>
        </form>
        <div className="mt-8 grid gap-3">
          {(notifications || []).map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border p-5 ${item.read_at ? "bg-white/60" : "bg-white"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={item.route}
                    className="font-bold hover:text-orange"
                  >
                    {item.safe_preview}
                  </Link>
                  <p className="mt-2 text-xs text-slate">
                    {new Date(item.created_at).toLocaleString()} ·{" "}
                    {item.event_key.replaceAll("_", " ")}
                  </p>
                </div>
                {!item.read_at && (
                  <form action={markRead}>
                    <input type="hidden" name="notification" value={item.id} />
                    <button className="rounded-xl border px-3 py-2 text-sm font-bold">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
          {!notifications?.length && (
            <p className="rounded-2xl border bg-white p-8 text-slate">
              No notifications yet.
            </p>
          )}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <Link
            href={href(Math.max(1, filters.page - 1))}
            className={`btn-ghost ${filters.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span className="text-sm font-bold">
            Page {filters.page} of {pages} · {count || 0}
          </span>
          <Link
            href={href(Math.min(pages, filters.page + 1))}
            className={`btn-ghost ${filters.page >= pages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      </div>
    </main>
  );
}
