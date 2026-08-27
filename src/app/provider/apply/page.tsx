import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { submitProviderApplication } from "./actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const p = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/provider/apply");
  if (p.submitted)
    return (
      <main className="shell grid min-h-screen place-items-center py-12">
        <section className="card max-w-xl text-center">
          <p className="eyebrow">Application submitted</p>
          <h1 className="mt-3 text-4xl font-black">
            Thanks for your interest in MUBER.
          </h1>
          <p className="mt-5 text-slate">
            Our compliance team will review your information. Applying does not
            grant provider access, guarantee jobs, or enable payments.
          </p>
          <Link href="/" className="btn-navy mt-8">
            Return home
          </Link>
        </section>
      </main>
    );
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
