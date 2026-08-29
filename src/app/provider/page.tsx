import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardCheck,
  MapPinned,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
const benefits = [
  [BriefcaseBusiness, "Reviewed job opportunities"],
  [MapPinned, "Service-area matching"],
  [CalendarCheck, "Availability controls"],
  [ShieldCheck, "Credential readiness"],
  [ChartNoAxesCombined, "Operational job tools"],
  [Users, "Crew and fleet management"],
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
                Apply to join MUBER <ArrowRight size={18} />
              </Link>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">
                No application fee. Application and approval are separate. No
                job volume, revenue, earnings, or payment capability is
                guaranteed.
              </p>
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
        <section className="shell py-20">
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="card">
              <ClipboardCheck className="text-orange" />
              <p className="eyebrow mt-6">Moving companies</p>
              <h2 className="mt-2 text-3xl font-black">Licensed businesses</h2>
              <p className="mt-4 leading-7 text-slate">
                California household-moving applicants must maintain the
                permits, insurance, vehicles, personnel, and operating authority
                required for every service they perform. MUBER verifies
                credentials before dispatch eligibility.
              </p>
            </article>
            <article className="card">
              <ShieldCheck className="text-orange" />
              <p className="eyebrow mt-6">Junk-removal companies</p>
              <h2 className="mt-2 text-3xl font-black">Lawful hauling</h2>
              <p className="mt-4 leading-7 text-slate">
                Applicants should operate an established business with suitable
                insurance, vehicles, crews, and lawful disposal capability.
                Restricted materials and specialized hauling remain outside an
                applicant’s eligibility unless separately verified.
              </p>
            </article>
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
                MUBER. Payments and payouts are not active in the application.
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
