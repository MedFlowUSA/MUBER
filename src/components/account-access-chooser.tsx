import Link from "next/link";
import { Logo } from "./logo";

const options = [
  {
    title: "Customer",
    copy: "Request moving or junk-removal service and manage your jobs.",
    login: "/customer/login",
    register: "/customer/register",
    action: "Continue as a customer",
  },
  {
    title: "Contractor",
    copy: "Apply to join MUBER or access an approved contractor company.",
    login: "/contractor/login",
    register: "/contractor/register",
    action: "Continue as a contractor",
  },
  {
    title: "MUBER staff",
    copy: "Restricted access for authorized dispatch and administrative staff.",
    login: "/admin/login",
    action: "Staff sign in",
  },
];

export function AccountAccessChooser({ mode }: { mode: "login" | "register" }) {
  return (
    <main className="min-h-screen bg-warm px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <Logo />
        <div className="mt-12 max-w-2xl">
          <p className="eyebrow">Choose your portal</p>
          <h1 className="mt-3 text-4xl font-black text-navy">
            {mode === "login"
              ? "Where do you work with MUBER?"
              : "How will you use MUBER?"}
          </h1>
          <p className="mt-4 text-slate">
            Each portal uses the same secure account system with permissions
            enforced by MUBER and the database.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {options.map((option) => {
            const href = mode === "register" ? option.register : option.login;
            if (!href) return null;
            return (
              <section key={option.title} className="card flex flex-col">
                <h2 className="text-2xl font-black">{option.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate">
                  {option.copy}
                </p>
                <Link href={href} className="btn-primary mt-7 text-center">
                  {mode === "login"
                    ? option.action
                    : `Create ${option.title.toLowerCase()} account`}
                </Link>
                {mode === "register" && option.title === "Contractor" && (
                  <p className="mt-3 text-xs leading-5 text-slate">
                    Registration starts an application. Contractor access is
                    granted only after MUBER approval.
                  </p>
                )}
              </section>
            );
          })}
        </div>
        <p className="mt-8 text-sm font-bold">
          {mode === "login" ? "Need an account?" : "Already registered?"}{" "}
          <Link
            className="text-orange-700 underline"
            href={mode === "login" ? "/auth/register" : "/auth/login"}
          >
            {mode === "login"
              ? "Choose an account type"
              : "Choose a sign-in portal"}
          </Link>
        </p>
      </div>
    </main>
  );
}
