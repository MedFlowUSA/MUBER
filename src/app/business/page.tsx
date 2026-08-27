import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  Recycle,
  Truck,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";

const useCases = [
  [
    Building2,
    "Property turns",
    "Coordinated removal and moving support for apartments, rentals, and managed properties.",
  ],
  [
    Truck,
    "Office and facility moves",
    "Structured requests for office furniture, equipment, and internal relocations.",
  ],
  [
    Recycle,
    "Recurring junk removal",
    "A dependable workflow for cleanouts, bulky items, and approved disposal needs.",
  ],
  [
    CalendarRange,
    "Multi-job coordination",
    "A foundation for recurring service, multiple locations, and organized job histories.",
  ],
] as const;

export default function BusinessPage() {
  return (
    <SiteShell>
      <main>
        <section className="bg-navy py-20 text-white sm:py-28">
          <div className="shell max-w-5xl">
            <p className="eyebrow">MUBER for business</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-.05em] sm:text-7xl">
              Moving and removal support for the work that keeps properties
              running.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              MUBER helps property teams and businesses organize moving and
              junk-removal requests through one managed workflow. Now serving
              Southern California, with nationwide expansion ahead.
            </p>
            <Link href="/support" className="btn-primary mt-8">
              Talk with MUBER <ArrowRight size={18} />
            </Link>
          </div>
        </section>
        <section className="shell py-20 sm:py-28">
          <p className="eyebrow">Built for recurring needs</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-.04em]">
            One partner for moves, cleanouts, and property logistics.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {useCases.map(([Icon, title, copy]) => (
              <article key={title} className="card">
                <Icon className="text-orange" />
                <h3 className="mt-6 text-xl font-black">{title}</h3>
                <p className="mt-3 leading-7 text-slate">{copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 rounded-3xl bg-orange p-8 text-white sm:p-10">
            <h2 className="text-3xl font-black">
              Launching with select Southern California partners.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-white/80">
              Business-account tools are still developing. Contact us to discuss
              service availability and your operational needs. No service volume
              or nationwide coverage is guaranteed.
            </p>
            <Link href="/support" className="btn mt-7 bg-white text-orange">
              Contact business support <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
