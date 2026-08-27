import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { CompletionEvidenceUpload } from "@/components/completion-evidence-upload";
import { requireOperationalRole } from "@/lib/authorization";
import { startCompletionDraft, submitCompletion } from "./actions";
export default async function CompletionPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignment: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { assignment } = await params;
  const query = await searchParams;
  const { supabase } = await requireOperationalRole(
    ["crew_lead"],
    `/crew/completion/${assignment}`,
  );
  const { data: item } = await supabase
    .from("assignments")
    .select(
      "id,status,job_id,jobs(reference,service,description),completion_submissions(id,version,status,review_notes),completion_drafts(id,status,policy_id,completion_draft_media(id,purpose))",
    )
    .eq("id", assignment)
    .maybeSingle();
  const latest = item?.completion_submissions?.sort(
    (a, b) => b.version - a.version,
  )[0];
  const revision =
    item?.status === "completion_review" &&
    ["more_information_requested", "returned_to_provider"].includes(
      latest?.status || "",
    );
  if (!item || (item.status !== "in_progress" && !revision)) notFound();
  const draft = item.completion_drafts?.find(
    (value) => value.status === "draft",
  );
  const job = (Array.isArray(item.jobs) ? item.jobs[0] : item.jobs) as {
    reference: string;
    service: string;
    description: string;
  } | null;
  return (
    <RoleShell role="crew">
      <Link href="/crew" className="text-sm font-bold text-orange-600">
        ← Crew work
      </Link>
      <p className="eyebrow mt-6">{job?.reference}</p>
      <h1 className="mt-2 text-4xl font-black">Document completion</h1>
      <p className="mt-3 text-slate">
        Submit truthful field evidence for dispatcher review. This does not
        confirm the customer, collect payment, or release funds.
      </p>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {revision && (
        <p className="mt-5 rounded-xl bg-orange-50 p-4 text-orange-900">
          <strong>Corrections requested:</strong> {latest?.review_notes}
        </p>
      )}
      {!revision && !draft && (
        <form
          action={startCompletionDraft}
          className="mt-8 rounded-2xl border bg-white p-6"
        >
          <input type="hidden" name="assignment" value={assignment} />
          <p className="font-bold">
            Start a private draft to load the server-selected evidence policy.
            This does not submit completion.
          </p>
          <button className="mt-4 rounded-xl bg-navy px-5 py-3 font-bold text-white">
            Start completion draft
          </button>
        </form>
      )}
      {!revision && draft && (
        <section className="mt-8 rounded-2xl bg-warm p-5">
          <h2 className="text-xl font-black">Evidence progress</h2>
          <p className="mt-2 text-sm">
            The default policy requires at least one before and one after photo.
            Uploads require a network connection; offline upload is not active.
          </p>
          <p className="mt-3 font-bold">
            Uploaded:{" "}
            {draft.completion_draft_media
              .map((media) => media.purpose.replaceAll("_", " "))
              .join(", ") || "none"}
          </p>
          <CompletionEvidenceUpload
            submission={draft.id}
            job={item.job_id}
            draft
          />
        </section>
      )}
      {(revision || draft) && (
        <form
          action={submitCompletion}
          className="mt-8 grid gap-4 rounded-3xl border bg-white p-6"
        >
          <input type="hidden" name="assignment" value={assignment} />
          {draft && <input type="hidden" name="draft" value={draft.id} />}
          {revision && <input type="hidden" name="revision" value="1" />}
          <input type="hidden" name="request_id" value={crypto.randomUUID()} />
          <label className="font-bold">
            Work performed
            <textarea
              required
              minLength={20}
              name="work_summary"
              className="mt-1 min-h-28 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          <label className="font-bold">
            Items moved or removed
            <textarea
              required
              minLength={10}
              name="items_summary"
              className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          <label className="font-bold">
            Customer-visible summary
            <textarea
              required
              minLength={20}
              name="customer_summary"
              className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          <label className="font-bold">
            Internal completion notes
            <textarea
              name="completion_notes"
              className="mt-1 min-h-20 w-full rounded-xl border p-3 font-normal"
            />
          </label>
          {job?.service === "remove" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="disposal_destination"
                placeholder="Disposal destination"
                className="rounded-xl border p-3"
              />
              <input
                name="donation_destination"
                placeholder="Donation destination"
                className="rounded-xl border p-3"
              />
              <select
                name="disposal_receipt_status"
                className="rounded-xl border p-3"
              >
                <option value="not_available">Receipt not available</option>
                <option value="provided">Receipt available</option>
                <option value="not_applicable">Not applicable</option>
              </select>
            </div>
          )}
          <fieldset>
            <legend className="font-black">Required declarations</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["damage_declared", "Damage"],
                ["incident_declared", "Safety incident"],
                ["missing_item_declared", "Missing item"],
                ["access_issue_declared", "Property access issue"],
                ["additional_scope_declared", "Additional scope"],
              ].map(([name, label]) => (
                <label key={name} className="rounded-xl bg-warm p-3">
                  <input type="checkbox" name={name} /> {label} declared
                </label>
              ))}
            </div>
          </fieldset>
          <label className="font-bold">
            Was the customer present?
            <select
              name="customer_present"
              className="mt-1 block w-full rounded-xl border p-3 font-normal"
            >
              <option value="">Not recorded</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <button className="rounded-xl bg-orange-600 px-5 py-4 text-lg font-black text-white">
            {revision
              ? "Submit immutable revision"
              : "Submit immutable completion record"}
          </button>
        </form>
      )}
    </RoleShell>
  );
}
