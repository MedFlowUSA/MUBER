import Link from "next/link";
import { SiteShell } from "./site-shell";
type LegalPageProps =
  | { title: string; copy: string }
  | {
      title: string;
      intro: string;
      effective: string;
      children: React.ReactNode;
    };

export function LegalPage(props: LegalPageProps) {
  if ("copy" in props) {
    return (
      <SiteShell>
        <main className="shell min-h-[60vh] py-20">
          <p className="eyebrow">MUBER</p>
          <h1 className="mt-3 text-5xl font-black">{props.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate">
            {props.copy}
          </p>
          <Link href="/" className="btn-navy mt-10">
            Return home
          </Link>
        </main>
      </SiteShell>
    );
  }
  const { title, intro, effective, children } = props;
  return (
    <SiteShell>
      <main className="shell py-16 sm:py-20">
        <div className="max-w-4xl">
          <p className="eyebrow">MUBER</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-.04em]">
            {title}
          </h1>
          <p className="mt-4 text-sm font-bold text-slate">
            Effective {effective}
          </p>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate">{intro}</p>
          <div className="mt-10 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm leading-6">
            <strong>Questions or requests?</strong> Use the{" "}
            <Link
              href="/support"
              className="font-bold text-orange-700 underline"
            >
              MUBER Support page
            </Link>
            . We may need to verify your identity before acting on an account or
            privacy request.
          </div>
          <article className="mt-12 space-y-10">{children}</article>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/" className="btn-navy">
              Return home
            </Link>
            <Link
              href={title === "Privacy Policy" ? "/terms" : "/privacy"}
              className="btn-ghost"
            >
              Read the {title === "Privacy Policy" ? "Terms" : "Privacy Policy"}
            </Link>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-navy/10 pt-8">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-slate [&_a]:font-bold [&_a]:text-orange-700 [&_a]:underline [&_li]:ml-5 [&_ul]:list-disc">
        {children}
      </div>
    </section>
  );
}
