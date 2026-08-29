import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "./logo";
import { MUBER_PHONE_DISPLAY, MUBER_PHONE_TEL } from "@/lib/contact";
import { publicNav } from "@/lib/routes";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-warm/95 backdrop-blur">
      <div className="shell flex h-20 items-center justify-between">
        <Logo />
        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Main navigation"
        >
          {publicNav.map((x) => (
            <Link
              className="text-sm font-bold text-slate hover:text-navy"
              key={x.href}
              href={x.href}
            >
              {x.label}
            </Link>
          ))}
          <Link className="text-sm font-black text-navy" href="/portal">
            Log in
          </Link>
          <Link className="btn-primary" href="/book/move">
            Book a job
          </Link>
        </nav>
        <details className="relative lg:hidden">
          <summary
            className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-navy/15"
            aria-label="Open menu"
          >
            <Menu />
          </summary>
          <nav className="absolute right-0 mt-3 w-64 rounded-2xl border border-navy/10 bg-white p-3 shadow-lift">
            {publicNav.map((x) => (
              <Link
                className="block rounded-xl p-3 font-bold hover:bg-warm"
                key={x.href}
                href={x.href}
              >
                {x.label}
              </Link>
            ))}
            <Link
              className="block rounded-xl p-3 font-black hover:bg-warm"
              href="/portal"
            >
              Log in
            </Link>
            <Link className="btn-primary mt-2 w-full" href="/book/move">
              Book a job
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="bg-navy py-12 text-white">
      <div className="shell grid gap-10 md:grid-cols-[1fr_auto]">
        <div>
          <Logo compact />
          <p className="mt-5 max-w-md text-sm leading-6 text-white/70">
            Now serving Southern California, starting in Redlands and the Inland
            Empire. Coming soon to communities nationwide.
          </p>
          <p className="mt-4 text-sm font-black tracking-[.14em]">
            MOVE IT. <span className="text-orange">REMOVE IT.</span>
          </p>
          <p className="mt-5 text-sm text-white/75">
            AI-assisted reception:{" "}
            <a
              className="font-black text-white hover:text-orange"
              href={`tel:${MUBER_PHONE_TEL}`}
            >
              {MUBER_PHONE_DISPLAY}
            </a>
          </p>
        </div>
        <nav
          className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm text-white/75"
          aria-label="Footer"
        >
          {[
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
            ["Providers", "/provider"],
            ["Reviews", "/reviews"],
            ["Support", "/support"],
            ["Log in", "/portal"],
            ["Customer portal", "/customer/login"],
            ["Contractor portal", "/contractor/login"],
            ["Crew portal", "/crew"],
            ["Staff portal", "/admin/login"],
            ["Business partners", "/business"],
          ].map(([a, b]) => (
            <Link key={a} href={b} className="hover:text-white">
              {a}
            </Link>
          ))}
        </nav>
      </div>
      <div className="shell mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
        © {new Date().getFullYear()} MUBER Enterprises LLC · Redlands,
        California 92373. Independent providers are not MUBER employees.
      </div>
    </footer>
  );
}
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
