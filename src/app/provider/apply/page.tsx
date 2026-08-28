import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resubmitProviderInformation,
  submitProviderApplication,
} from "./actions";
import { providerApplicationStatus } from "@/lib/provider-application-status";

type ApplicationStatus = {
  id: string;
  status: string;
  legal_name: string;
  dba_name: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  updated_at: string;
  applicant_message: string | null;
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    submitted?: string;
    resubmitted?: string;
  }>;
}) {
  const p = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/contractor/login?next=/provider/apply");
  const { data: applicationRows } = await supabase.rpc(
    "my_provider_application_status",
  );
  const application = (applicationRows?.[0] ||
    null) as ApplicationStatus | null;
  if (application) {
    const presentation = providerApplicationStatus(application.status);
    return (
      <main className="shell grid min-h-screen place-items-center py-12">
        <section className="card w-full max-w-2xl">
          <p className="eyebrow">Contractor application</p>
          <div className={`mt-5 rounded-2xl border p-5 ${presentation.tone}`}>
            <p className="text-xs font-black uppercase tracking-widest">
              {presentation.label}
            </p>
            <h1 className="mt-2 text-3xl font-black">{presentation.heading}</h1>
            <p className="mt-3 leading-7">{presentation.description}</p>
          </div>
          <dl className="mt-6 grid gap-4 rounded-2xl bg-warm p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-black uppercase text-slate">
                Company
              </dt>
              <dd className="mt-1 font-bold">
                {application.dba_name || application.legal_name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase text-slate">
                Last updated
              </dt>
              <dd className="mt-1 font-bold">
                {new Date(application.updated_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-slate">
            An application does not guarantee jobs and does not enable payment
            capability.
          </p>
          {application.status === "information_requested" && (
            <form action={resubmitProviderInformation} className="mt-6">
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <p className="text-sm font-black">Requested information</p>
                <p className="mt-2 leading-6">
                  {application.applicant_message ||
                    "Contact MUBER support for the requested information."}
                </p>
              </div>
              {p.error && (
                <p role="alert" className="mt-4 text-sm font-bold text-red-700">
                  {p.error}
                </p>
              )}
              <label className="mt-5 block font-bold">
                Your response
                <textarea
                  name="response"
                  required
                  minLength={10}
                  maxLength={4000}
                  className="field mt-2 min-h-36 font-normal"
                  placeholder="Provide the requested details. Do not include banking information."
                />
              </label>
              <button className="btn-primary mt-4">Resubmit for review</button>
            </form>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            {application.status === "approved" && (
              <Link href="/provider/dashboard" className="btn-primary">
                Open contractor portal
              </Link>
            )}
            <Link href="/support" className="btn-navy">
              Contact support
            </Link>
            <Link href="/" className="btn-ghost">
              Return home
            </Link>
          </div>
        </section>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-warm">
      <header className="border-b border-navy/10 bg-white">
        <div className="shell flex h-20 items-center">
          <Logo />
        </div>
      </header>
      <div className="shell max-w-4xl py-12">
        <p className="eyebrow">Provider application</p>
        <h1 className="mt-3 text-4xl font-black">
          Tell us about your company.
        </h1>
        <p className="mt-4 max-w-2xl text-slate">
          Application and approval are separate. Do not provide banking
          information.
        </p>
        {p.error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 font-bold text-red-700"
          >
            {p.error}
          </p>
        )}
        <form
          action={submitProviderApplication}
          className="card mt-8 grid gap-5 sm:grid-cols-2"
        >
          <Field name="legal_name" label="Legal business name" />
          <Field name="dba_name" label="DBA name" required={false} />
          <Field name="business_email" label="Business email" type="email" />
          <Field name="business_phone" label="Business phone" type="tel" />
          <Field name="contact_name" label="Owner/contact name" />
          <Field name="business_address" label="Business address" />
          <Field name="service_territory" label="Service territory" />
          <Field
            name="years_in_business"
            label="Years in business"
            type="number"
          />
          <Field name="website" label="Website" required={false} />
          <Field name="crew_capacity" label="Maximum crew size" type="number" />
          <Field name="vehicle_types" label="Vehicle types (comma separated)" />
          <Field name="operating_hours" label="Operating hours" />
          <Field
            name="moving_services"
            label="Moving services (comma separated)"
            required={false}
          />
          <Field
            name="removal_services"
            label="Removal services (comma separated)"
            required={false}
          />
          <Select
            name="commercial_auto_status"
            label="Commercial auto insurance"
          />
          <Select name="liability_status" label="General liability insurance" />
          <Select name="cargo_status" label="Cargo insurance" />
          <Select
            name="ca_mover_permit_status"
            label="California mover permit"
          />
          <fieldset className="sm:col-span-2">
            <legend className="label">Services offered</legend>
            <div className="flex gap-5">
              <Check name="service_categories" value="move" label="Moving" />
              <Check
                name="service_categories"
                value="remove"
                label="Junk removal"
              />
            </div>
          </fieldset>
          <div className="space-y-3 sm:col-span-2">
            <Check name="same_day_available" label="Same-day availability" />
            <Check
              name="disposal_capability"
              label="Authorized disposal capability"
            />
            <Check
              name="background_consent"
              label="I consent to a future background/compliance review"
              required
            />
            <Check
              name="agreement_accepted"
              label="I accept the provider-application terms placeholder"
              required
            />
          </div>
          <label className="sm:col-span-2">
            <span className="label">Application notes</span>
            <textarea name="notes" className="field min-h-28" />
          </label>
          <button className="btn-primary sm:col-span-2">
            Submit for review
          </button>
        </form>
      </div>
    </main>
  );
}
function Field({
  name,
  label,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="field"
        name={name}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
      />
    </label>
  );
}
function Select({ name, label }: { name: string; label: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="field" name={name}>
        <option value="not_provided">Not provided</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="not_applicable">Not applicable</option>
      </select>
    </label>
  );
}
function Check({
  name,
  label,
  value = "on",
  required = false,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm font-bold">
      <input
        className="mt-1"
        type="checkbox"
        name={name}
        value={value}
        required={required}
      />
      {label}
    </label>
  );
}
