import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell flex min-h-[70vh] flex-col items-start justify-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-5xl font-black">That route moved on.</h1>
      <p className="mt-4 text-slate">Let’s get you back to the right place.</p>
      <Link className="btn-primary mt-8" href="/">
        Return home
      </Link>
    </main>
  );
}
