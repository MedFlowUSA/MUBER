import Link from "next/link";
import { RefreshCw, RotateCcw } from "lucide-react";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { EmptyState } from "@/components/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { statusForCustomer } from "@/lib/job-status";
import { ConversationWorkload } from "@/components/conversation-workload";
export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/customer");
  const [{ data, error }, { data: conversationCounts }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id,reference,service,status,preferred_start,time_window,created_at,job_stops(stop_type,addresses(city,region))",
      )
      .order("created_at", { ascending: false }),
    supabase.rpc("conversation_workload_counts"),
  ]);
  return (
    <RoleShell role="customer">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Customer dashboard</p>
          <h1 className="mt-2 text-4xl font-black">Your requests</h1>
          <p className="mt-3 text-sm text-slate">Signed in as {user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customer" className="btn-ghost">
            <RefreshCw size={17} />
            Refresh
          </Link>
          <Link href="/book/move" className="btn-primary">
            <RotateCcw size={17} />
            Book again
          </Link>
          <form action={logout}>
            <button className="btn-ghost">Sign out</button>
          </form>
        </div>
      </div>
      <ConversationWorkload counts={conversationCounts} />
      {error ? (
        <div role="alert" className="card mt-8 text-red-700">
          <h2 className="font-black">Requests could not be loaded</h2>
          <p className="mt-2 text-sm">
            Refresh the page or contact support. No sample data has been
            substituted.
          </p>
        </div>
      ) : !data?.length ? (
        <div className="mt-8">
          <EmptyState
            title="No requests yet"
            copy="Your submitted moving and junk-removal requests will appear here."
            action={{ label: "Start a request", href: "/book/move" }}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {data.map((job) => (
            <Link
              href={`/customer/jobs/${job.id}`}
              key={job.id}
              className="card transition hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-orange">
                    {job.reference}
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {job.service === "move" ? "Move It" : "Remove It"}
                  </h2>
                </div>
                <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold capitalize">
                  {statusForCustomer(job.status).label}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate">
                Requested{" "}
                {job.preferred_start
                  ? new Date(job.preferred_start).toLocaleDateString()
                  : "date pending"}{" "}
                · {job.time_window || "Flexible"}
              </p>
              <p className="mt-2 text-sm font-bold">
                Next: {statusForCustomer(job.status).next}
              </p>
            </Link>
          ))}
        </div>
      )}
    </RoleShell>
  );
}
