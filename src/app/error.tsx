"use client";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-warm py-20">
      <div className="shell max-w-xl rounded-3xl border bg-white p-8 text-center">
        <p className="eyebrow">Temporary problem</p>
        <h1 className="mt-2 text-3xl font-black">
          We could not load this page
        </h1>
        <p className="mt-4 text-slate">
          Try again. If the problem continues, contact MUBER support and include
          the reference below.
        </p>
        {error.digest && (
          <p className="mt-4 font-mono text-xs text-slate">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/support" className="btn-ghost">
            Contact support
          </Link>
        </div>
      </div>
    </main>
  );
}
