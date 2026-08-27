import Link from "next/link";
import { Bell, LockKeyhole } from "lucide-react";
import { Logo } from "./logo";
import { portalMenus } from "@/lib/routes";
type RoleKey = keyof typeof portalMenus;
export function RoleShell({
  role,
  children,
}: {
  role: RoleKey;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warm">
      <header className="border-b border-navy/10 bg-white">
        <div className="shell flex h-20 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-orange/10 px-3 py-2 text-xs font-black text-orange sm:block">
              PHASE 1 PREVIEW
            </span>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="grid size-11 place-items-center rounded-full border border-navy/10"
            >
              <Bell size={19} />
            </Link>
          </div>
        </div>
      </header>
      <div className="shell grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav
            className="flex gap-2 overflow-auto lg:flex-col"
            aria-label="Role areas"
          >
            {portalMenus[role].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate hover:bg-navy hover:text-white"
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 hidden rounded-2xl bg-orange/10 p-4 text-xs leading-5 text-slate lg:block">
            <LockKeyhole className="mb-2 text-orange" size={18} />
            <strong className="text-navy">Protected portal.</strong> Access is
            filtered by authenticated role and database policies.
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
