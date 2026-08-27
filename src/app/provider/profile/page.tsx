import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { updateCompanyProfile } from "./actions";
import { WeeklyHoursEditor } from "@/components/weekly-hours-editor";

export default async function ContractorProfile({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const query = await searchParams;
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/profile",
  );
  const { data: company } = await supabase
    .from("provider_companies")
    .select(
      "legal_name,display_name,business_email,business_phone,website,service_area,operating_hours,available,same_day_available,status",
    )
    .maybeSingle();
  if (!company)
    return (
      <RoleShell role="provider">
        <p className="rounded-2xl border bg-white p-8">
          Your approved contractor company is not active yet.
        </p>
      </RoleShell>
    );
  return (
    <RoleShell role="provider">
      <p className="eyebrow">Contractor portal</p>
      <h1 className="mt-2 text-4xl font-black">Company profile</h1>
      <p className="mt-3 text-slate">
        Legal business name: <strong>{company.legal_name}</strong> · Status:{" "}
        <strong>{company.status}</strong>
      </p>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {query.updated && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Company profile updated and audited.
        </p>
      )}
      <form
        action={updateCompanyProfile}
        className="card mt-8 grid gap-4 md:grid-cols-2"
      >
        <label className="font-bold">
          Public display name
          <input
            name="display_name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={company.display_name || company.legal_name}
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="font-bold">
          Business email
          <input
            name="business_email"
            type="email"
            required
            defaultValue={company.business_email || ""}
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="font-bold">
          Business phone
          <input
            name="business_phone"
            required
            minLength={7}
            maxLength={30}
            defaultValue={company.business_phone || ""}
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="font-bold">
          Website
          <input
            name="website"
            type="url"
            defaultValue={company.website || ""}
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="font-bold md:col-span-2">
          Service territory
          <textarea
            name="service_area"
            required
            minLength={3}
            defaultValue={
              (company.service_area as { description?: string })?.description ||
              ""
            }
            className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <WeeklyHoursEditor initial={company.operating_hours} />
        <label className="flex gap-2 font-bold">
          <input
            name="available"
            type="checkbox"
            defaultChecked={company.available}
          />{" "}
          Available for offers
        </label>
        <label className="flex gap-2 font-bold">
          <input
            name="same_day_available"
            type="checkbox"
            defaultChecked={company.same_day_available}
          />{" "}
          Same-day availability
        </label>
        <button className="btn-primary md:col-span-2">
          Save company profile
        </button>
      </form>
    </RoleShell>
  );
}
