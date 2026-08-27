import Link from "next/link";
import { Bell, LockKeyhole } from "lucide-react";
import { Logo } from "./logo";
import { roleRoutes } from "@/lib/routes";
type RoleKey = keyof typeof roleRoutes;
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
            <button
              aria-label="Notifications"
              className="grid size-11 place-items-center rounded-full border border-navy/10"
            >
              <Bell size={19} />
            </button>
          </div>
        </div>
      </header>
      <div className="shell grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav
            className="flex gap-2 overflow-auto lg:flex-col"
            aria-label="Role areas"
          >
            {Object.entries(roleRoutes).map(([key, item]) => {
              const Icon = item.icon;
              return (
                <Link
                  key={key}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${key === role ? "bg-navy text-white" : "bg-white text-slate hover:text-navy"}`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 hidden rounded-2xl bg-orange/10 p-4 text-xs leading-5 text-slate lg:block">
            <LockKeyhole className="mb-2 text-orange" size={18} />
            <strong className="text-navy">
              Authentication-ready preview.
            </strong>{" "}
            Supabase Auth and RLS are required before private data is enabled.
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
