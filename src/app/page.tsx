import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  CreditCard,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";

const trust = [
  {
    icon: BadgeCheck,
    title: "Verified providers",
    copy: "Provider onboarding is designed around business, insurance, and credential review.",
  },
  {
    icon: MessageCircle,
    title: "Clear communication",
    copy: "One organized place for job details, updates, and scope changes.",
  },
  {
    icon: Camera,
    title: "Photo-supported estimates",
    copy: "Show providers what the job involves before arrival.",
  },
  {
    icon: CreditCard,
    title: "Secure digital payments",
    copy: "A payment-ready foundation, with live processing coming later.",
  },
  {
    icon: CheckCircle2,
    title: "Documented completion",
    copy: "Job history and completion records built into the workflow.",
  },
];
export default function Home() {
  return (
    <SiteShell>
      <main>
        <section className="relative overflow-hidden bg-navy py-16 text-white sm:py-24">
          <div className="absolute -right-32 -top-32 size-96 rounded-full bg-orange/15 blur-3xl" />
          <div className="shell relative grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
            <div className="animate-rise">
              <p className="eyebrow">Redlands + the Inland Empire</p>
              <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[.95] tracking-[-.05em] sm:text-7xl">
                The simpler way to move what matters.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
                Book moving or junk removal through one dependable, app-like
                experience—built to keep every detail clear from request to
                completion.
              </p>
              <p className="mt-8 text-sm font-black tracking-[.2em]">
                MOVE IT. <span className="text-orange">REMOVE IT.</span>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <ServiceCard
                href="/book/move"
                title="Move It"
                copy="Homes, apartments, offices, labor-only moves, and specialty items."
                icon={<Truck />}
              />
              <ServiceCard
                href="/book/remove"
                title="Remove It"
                copy="Furniture, appliances, cleanouts, yard debris, and more."
                orange
                icon={<Sparkles />}
              />
            </div>
          </div>
        </section>
        <section id="how" className="shell py-20 sm:py-28">
          <p className="eyebrow">One clear process</p>
          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="max-w-2xl text-4xl font-black tracking-[-.04em] sm:text-5xl">
              How MUBER works
            </h2>
            <p className="max-w-md text-slate">
              Less chasing. More certainty. Your request stays organized from
              the first detail through the final handoff.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              "Tell us what needs to move",
              "Get matched with a verified local professional",
              "Track and complete the job",
            ].map((x, i) => (
              <article className="card relative overflow-hidden" key={x}>
                <span className="text-6xl font-black text-navy/10">
                  0{i + 1}
                </span>
                <h3 className="mt-8 text-xl font-black">{x}</h3>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-white py-20">
          <div className="shell">
            <p className="eyebrow">Confidence at every step</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-.04em]">
              Built for jobs that deserve more than a lead form.
            </h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {trust.map(({ icon: Icon, title, copy }) => (
                <article key={title} className="rounded-3xl bg-warm p-5">
                  <Icon className="text-orange" />
                  <h3 className="mt-5 font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="area" className="shell py-20 sm:py-28">
          <div className="grid overflow-hidden rounded-4xl bg-navy text-white lg:grid-cols-2">
            <div className="p-8 sm:p-14">
              <MapPin className="text-orange" />
              <p className="eyebrow mt-8">Our launch area</p>
              <h2 className="mt-3 text-4xl font-black">
                Rooted in Redlands. Ready for the Inland Empire.
              </h2>
              <p className="mt-5 leading-7 text-white/70">
                We’re starting local, with service availability confirmed for
                each request. Submit your details to see how we can help.
              </p>
              <Link className="btn-primary mt-8" href="/book/move">
                Start a request <ArrowRight size={18} />
              </Link>
            </div>
            <div className="relative min-h-80 bg-[radial-gradient(circle_at_30%_45%,rgba(255,107,26,.35),transparent_18%),linear-gradient(135deg,#173d60,#102A43)]">
              <div className="absolute left-[30%] top-[42%] size-5 rounded-full bg-orange shadow-[0_0_0_12px_rgba(255,107,26,.18)]" />
              <div className="absolute inset-8 rounded-[40%_60%_55%_45%] border border-white/15" />
              <div className="absolute inset-20 rounded-[55%_45%_40%_60%] border border-white/10" />
            </div>
          </div>
        </section>
        <section className="shell pb-24">
          <div className="grid gap-5 md:grid-cols-2">
            <Cta
              icon={<ShieldCheck />}
              title="Grow with MUBER"
              copy="Bring your licensed, insured moving or removal company to a platform designed for well-scoped local work."
              href="/provider"
              label="Become a provider"
            />
            <Cta
              icon={<Building2 />}
              title="Moving things for business?"
              copy="Talk with us about recurring removals, property turns, office moves, and future partner accounts."
              href="/support"
              label="Explore business accounts"
              light
            />
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
function ServiceCard({
  href,
  title,
  copy,
  icon,
  orange = false,
}: {
  href: string;
  title: string;
  copy: string;
  icon: React.ReactNode;
  orange?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-3xl p-7 transition hover:-translate-y-1 ${orange ? "bg-orange text-white" : "bg-white text-navy"}`}
    >
      <div
        className={`grid size-12 place-items-center rounded-2xl ${orange ? "bg-white/15" : "bg-navy/10"}`}
      >
        {icon}
      </div>
      <h2 className="mt-8 text-3xl font-black">{title}</h2>
      <p
        className={`mt-3 leading-6 ${orange ? "text-white/80" : "text-slate"}`}
      >
        {copy}
      </p>
      <span className="mt-7 inline-flex items-center gap-2 text-sm font-black">
        Start request{" "}
        <ArrowRight
          size={18}
          className="transition group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}
function Cta({
  icon,
  title,
  copy,
  href,
  label,
  light = false,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  href: string;
  label: string;
  light?: boolean;
}) {
  return (
    <article
      className={`rounded-4xl p-8 sm:p-10 ${light ? "border border-navy/10 bg-white" : "bg-orange text-white"}`}
    >
      <div>{icon}</div>
      <h2 className="mt-8 text-3xl font-black">{title}</h2>
      <p
        className={`mt-4 max-w-xl leading-7 ${light ? "text-slate" : "text-white/80"}`}
      >
        {copy}
      </p>
      <Link
        className={`mt-8 ${light ? "btn-navy" : "btn bg-white text-orange"}`}
        href={href}
      >
        {label}
        <ArrowRight size={18} />
      </Link>
    </article>
  );
}
