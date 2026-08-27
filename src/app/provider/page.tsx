import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarCheck,
  ChartNoAxesCombined,
  CreditCard,
  Users,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
const benefits = [
  [BriefcaseBusiness, "Well-scoped local jobs"],
  [Users, "Customer acquisition"],
  [CalendarCheck, "Booking tools"],
  [CreditCard, "Digital payments"],
  [ChartNoAxesCombined, "Job-management tools"],
  [BadgeDollarSign, "Earnings visibility"],
] as const;
export default function Page() {
  return (
    <SiteShell>
      <main>
        <section className="bg-navy py-20 text-white">
          <div className="shell grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">For independent providers</p>
              <h1 className="mt-4 text-5xl font-black tracking-[-.05em] sm:text-6xl">
                Do great local work. We’ll build the tools around it.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
                Join a managed marketplace for qualified moving and junk-removal
                companies serving Southern California, with nationwide expansion
                ahead.
              </p>
              <Link href="/provider/apply" className="btn-primary mt-8">
                Become a provider <ArrowRight size={18} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {benefits.map(([Icon, x]) => (
                <div className="rounded-3xl bg-white/10 p-5" key={x}>
                  <Icon className="text-orange" />
                  <p className="mt-6 font-bold">{x}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="apply" className="shell py-20">
          <div className="grid gap-10 rounded-4xl bg-white p-8 shadow-soft lg:grid-cols-2 sm:p-12">
            <div>
              <p className="eyebrow">Provider interest</p>
              <h2 className="mt-3 text-4xl font-black">
                Help shape the provider experience.
              </h2>
              <p className="mt-5 leading-7 text-slate">
                Applications are open for qualified moving and junk-removal
                companies. Applying does not guarantee approval, jobs, income,
                employment, or benefits. Providers remain independent
                businesses.
              </p>
            </div>
            <div className="rounded-3xl bg-warm p-7">
              <h3 className="text-xl font-black">
                Provider applications are open
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate">
                Tell us about your company, credentials, service area, vehicles,
                crews, and operating capabilities. Approval is reviewed by
                MUBER.
              </p>
              <Link href="/provider/apply" className="btn-navy mt-7">
                Start your application
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
