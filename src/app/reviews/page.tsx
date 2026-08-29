import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";

const standards = [
  {
    icon: BadgeCheck,
    title: "Connected to completed work",
    copy: "A published review must be associated with a completed MUBER job. A public visitor cannot create a review for a job they did not book or perform.",
  },
  {
    icon: MessagesSquare,
    title: "Useful feedback from both sides",
    copy: "Customer and provider feedback will be collected separately so MUBER can improve service quality, job scope, communication, and marketplace conduct.",
  },
  {
    icon: ShieldCheck,
    title: "Moderated for integrity—not sentiment",
    copy: "Feedback may be reviewed for privacy, threats, spam, or unrelated content. A review will not be removed merely because it is critical or unfavorable.",
  },
];

export default function ReviewsPage() {
  return (
    <SiteShell>
      <main>
        <section className="bg-navy py-20 text-white">
          <div className="shell max-w-4xl">
            <p className="eyebrow">Reviews and marketplace feedback</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-.05em] sm:text-6xl">
              Trust starts with telling the truth.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
              MUBER is new, so there are no verified customer or provider
              reviews published yet. We will never invent experiences to make
              the marketplace appear more established than it is.
            </p>
          </div>
        </section>
        <section className="shell py-20 sm:py-28">
          <div className="rounded-4xl border border-navy/10 bg-white p-8 shadow-soft sm:p-12">
            <p className="eyebrow">Current review status</p>
            <h2 className="mt-3 text-4xl font-black">
              No reviews published yet
            </h2>
            <p className="mt-5 max-w-3xl leading-7 text-slate">
              Reviews will appear here after MUBER completes its controlled
              launch and receives authentic feedback tied to completed service.
              Until then, our product, policies, provider standards, and support
              process are available for you to evaluate directly.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {standards.map(({ icon: Icon, title, copy }) => (
              <article className="card" key={title}>
                <Icon className="text-orange" />
                <h2 className="mt-6 text-xl font-black">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate">{copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/book/remove" className="btn-primary">
              Start a request <ArrowRight size={18} />
            </Link>
            <Link href="/provider" className="btn-navy">
              Apply as a provider
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
