import Link from "next/link";
export default function NotFound() {
  return (
    <main className="min-h-screen bg-warm py-20">
      <div className="shell max-w-xl rounded-3xl border bg-white p-8 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-3xl font-black">Page not found</h1>
        <p className="mt-4 text-slate">
          This page may have moved, or your account may not have access.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/portal" className="btn-primary">
            Open my portal
          </Link>
          <Link href="/support" className="btn-ghost">
            Get support
          </Link>
        </div>
      </div>
    </main>
  );
}
