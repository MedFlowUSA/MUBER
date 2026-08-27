import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { markRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/notifications");
  const { data: notifications } = await supabase
    .from("in_app_notifications")
    .select("id,event_key,route,safe_preview,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <main className="min-h-screen bg-warm py-12">
      <div className="shell max-w-3xl">
        <Link href="/" className="text-sm font-bold text-orange-600">
          ← MUBER home
        </Link>
        <p className="eyebrow mt-6">Account activity</p>
        <h1 className="mt-2 text-4xl font-black">Notifications</h1>
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
      </div>
    </main>
  );
}
