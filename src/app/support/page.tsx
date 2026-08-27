import { SiteShell } from "@/components/site-shell";
import { submitSupportRequest } from "./actions";
type Props = { searchParams: Promise<{ error?: string; submitted?: string }> };
export default async function SupportPage({ searchParams }: Props) {
  const query = await searchParams;
  return (
    <SiteShell>
      <main className="shell py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="eyebrow">MUBER support</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-.04em]">
            How can we help?
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate">
            Submit a customer, provider, business, safety, account, or privacy
            request. Do not include passwords, payment-card data, government
            identification numbers, or unrelated sensitive documents.
          </p>
          {query.error && (
            <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">
              {query.error}
            </p>
          )}
          {query.submitted && (
            <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-800">
              Request received. Reference: <strong>{query.submitted}</strong>.
              Privacy requests require identity verification before records are
              disclosed or changed.
            </p>
          )}
          <form
            action={submitSupportRequest}
            className="mt-8 grid gap-4 rounded-3xl border bg-white p-6 shadow-sm sm:p-8"
          >
            <label className="text-sm font-bold">
              Request type
              <select
                name="category"
                required
                className="mt-1 w-full rounded-xl border px-4 py-3 font-normal"
              >
                <option value="">Choose a category</option>
                <option value="customer_job">Customer job</option>
                <option value="provider_application">
                  Provider application
                </option>
                <option value="provider_operations">Provider operations</option>
                <option value="business_account">Business account</option>
                <option value="account_access">Account access</option>
                <option value="privacy_access">
                  Privacy: access my information
                </option>
                <option value="privacy_correction">
                  Privacy: correct my information
                </option>
                <option value="privacy_deletion">
                  Privacy: delete my information
                </option>
                <option value="safety">Safety concern</option>
                <option value="other">Other</option>
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  className="mt-1 w-full rounded-xl border px-4 py-3 font-normal"
                />
              </label>
              <label className="text-sm font-bold">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border px-4 py-3 font-normal"
                />
              </label>
            </div>
            <label className="text-sm font-bold">
              Job reference, if applicable
              <input
                name="job_reference"
                maxLength={60}
                placeholder="MUB-..."
                className="mt-1 w-full rounded-xl border px-4 py-3 font-normal"
              />
            </label>
            <label className="text-sm font-bold">
              Subject
              <input
                name="subject"
                required
                minLength={5}
                maxLength={160}
                className="mt-1 w-full rounded-xl border px-4 py-3 font-normal"
              />
            </label>
            <label className="text-sm font-bold">
              Details
              <textarea
                name="details"
                required
                minLength={20}
                maxLength={5000}
                className="mt-1 min-h-40 w-full rounded-xl border px-4 py-3 font-normal"
              />
            </label>
            <label className="hidden" aria-hidden="true">
              Company website
              <input name="company_website" tabIndex={-1} autoComplete="off" />
            </label>
            <button className="btn-primary">Submit support request</button>
            <p className="text-xs leading-5 text-slate">
              Up to five requests per hour may be submitted for an account or
              email address. For immediate danger, contact local emergency
              services.
            </p>
          </form>
        </div>
      </main>
    </SiteShell>
  );
}
