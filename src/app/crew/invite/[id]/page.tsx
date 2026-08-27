import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInvitation } from "./actions";
type Preview = {
  provider_name: string;
  crew_name: string | null;
  intended_role: string;
  status: string;
  expires_at: string;
};
export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const token = query.token || "";
  const supabase = await createSupabaseServerClient();
  const [{ data: rows }, { data: auth }] = await Promise.all([
    supabase.rpc("preview_crew_invitation", {
      p_invitation: id,
      p_token: token,
    }),
    supabase.auth.getUser(),
  ]);
  const preview = ((rows || [])[0] || null) as Preview | null;
  const next = `/crew/invite/${id}?token=${encodeURIComponent(token)}`;
  return (
    <SiteShell>
      <main className="shell py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-7 shadow-lift">
          <p className="eyebrow">Crew invitation</p>
          <h1 className="mt-2 text-4xl font-black">Join your provider crew</h1>
          {!preview ? (
            <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">
              This invitation link is invalid or no longer available.
            </p>
          ) : (
            <>
              <dl className="mt-7 grid gap-4 rounded-2xl bg-warm p-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate">Provider company</dt>
                  <dd className="font-black">{preview.provider_name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate">Crew</dt>
                  <dd className="font-black">
                    {preview.crew_name || "Assignment pending"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate">Role</dt>
                  <dd className="font-black">
                    {preview.intended_role.replaceAll("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate">Status</dt>
                  <dd className="font-black">{preview.status}</dd>
                </div>
              </dl>
              <div className="mt-6 text-sm leading-6 text-slate">
                <p>
                  Use only your own verified account. MUBER compares your
                  authenticated email with the invitation; this link alone
                  cannot grant access.
                </p>
                <p className="mt-2">
                  Location tracking and MUBER payments are not active. Keep your
                  password private and report unexpected access through Support.
                </p>
              </div>
              {query.error && (
                <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
                  {query.error}
                </p>
              )}
              {!auth.user ? (
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    className="btn-primary"
                    href={`/auth/login?next=${encodeURIComponent(next)}`}
                  >
                    Sign in to accept
                  </Link>
                  <Link
                    className="rounded-xl border px-5 py-3 font-bold"
                    href={`/auth/register?next=${encodeURIComponent(next)}`}
                  >
                    Create verified account
                  </Link>
                </div>
              ) : preview.status === "pending" ? (
                <form action={acceptInvitation} className="mt-7">
                  <input type="hidden" name="invitation" value={id} />
                  <input type="hidden" name="token" value={token} />
                  <button className="btn-primary">
                    Accept crew invitation
                  </button>
                </form>
              ) : (
                <p className="mt-6 font-bold">
                  This invitation is {preview.status} and is not actionable.
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
