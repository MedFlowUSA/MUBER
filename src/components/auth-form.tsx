import Link from "next/link";
import { Logo } from "./logo";
export function AuthForm({
  title,
  copy,
  action,
  kind,
  error,
  next,
  sent,
}: {
  title: string;
  copy: string;
  action: (data: FormData) => Promise<void>;
  kind: "login" | "register" | "forgot" | "reset";
  error?: string;
  next?: string;
  sent?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-warm p-5">
      <div className="w-full max-w-md">
        <Logo />
        <section className="card mt-8">
          <p className="eyebrow">Customer account</p>
          <h1 className="mt-3 text-3xl font-black">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate">
            {sent
              ? "If an account exists, password-reset instructions have been sent."
              : copy}
          </p>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
            >
              {error}
            </p>
          )}
          <form action={action} className="mt-7 space-y-4">
            <input type="hidden" name="next" value={next || "/customer"} />
            {kind === "register" && (
              <label>
                <span className="label">Full name</span>
                <input
                  className="field"
                  name="name"
                  required
                  autoComplete="name"
                />
              </label>
            )}
            {kind !== "reset" && (
              <label>
                <span className="label">Email</span>
                <input
                  className="field"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
            )}
            {kind !== "forgot" && (
              <label>
                <span className="label">Password</span>
                <input
                  className="field"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete={
                    kind === "login" ? "current-password" : "new-password"
                  }
                />
              </label>
            )}
            <button className="btn-primary w-full">
              {kind === "login"
                ? "Sign in"
                : kind === "register"
                  ? "Create account"
                  : kind === "forgot"
                    ? "Send reset link"
                    : "Update password"}
            </button>
          </form>
          <div className="mt-6 flex justify-between text-sm font-bold">
            {kind === "login" ? (
              <>
                <Link
                  href={`/auth/register?next=${encodeURIComponent(next || "/customer")}`}
                >
                  Create account
                </Link>
                <Link href="/auth/forgot">Forgot password?</Link>
              </>
            ) : (
              <Link href="/auth/login">Back to sign in</Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
