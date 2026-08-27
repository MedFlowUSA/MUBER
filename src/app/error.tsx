"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell flex min-h-[70vh] flex-col items-start justify-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-4xl font-black">
        We hit an unexpected roadblock.
      </h1>
      <p className="mt-4 max-w-lg text-slate">
        Your draft is stored on this device. Try the page again, or contact
        support if the problem continues.
      </p>
      <button className="btn-primary mt-8" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
