import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { removeAvailability, setAvailability } from "./actions";
export default async function Availability({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string; removed?: string }>;
}) {
  const query = await searchParams;
  const { supabase } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/availability",
  );
  const { data: days } = await supabase
    .from("provider_availability_days")
    .select("id,service_date,status,capacity_jobs,notes")
    .gte("service_date", new Date().toISOString().slice(0, 10))
    .order("service_date");
  return (
    <RoleShell role="provider">
      <p className="eyebrow">Contractor schedule</p>
      <h1 className="mt-2 text-4xl font-black">Availability calendar</h1>
      <p className="mt-3 text-slate">
        Set date-specific exceptions. Unavailable dates and existing assignment
        conflicts block new offers server-side.
      </p>
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {query.error}
        </p>
      )}
      {(query.updated || query.removed) && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          Availability updated and audited.
        </p>
      )}
      <form
        action={setAvailability}
        className="card mt-8 grid gap-3 md:grid-cols-2"
      >
        <label className="font-bold">
          Service date
          <input
            type="date"
            name="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="font-bold">
          Availability
          <select
            name="status"
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          >
            <option value="available">Available</option>
            <option value="limited">Limited capacity</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label className="font-bold">
          Capacity when limited
          <input
            type="number"
            name="capacity"
            min={1}
            max={20}
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <label className="font-bold">
          Internal scheduling note
          <input
            name="notes"
            maxLength={500}
            className="mt-1 block w-full rounded-xl border p-3 font-normal"
          />
        </label>
        <button className="btn-primary md:col-span-2">
          Save date availability
        </button>
      </form>
      <section className="mt-8">
        <h2 className="text-2xl font-black">Upcoming exceptions</h2>
        <div className="mt-4 grid gap-3">
          {(days || []).map((day) => (
            <article
              key={day.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5"
            >
              <div>
                <strong>
                  {new Date(
                    `${day.service_date}T12:00:00`,
                  ).toLocaleDateString()}
                </strong>
                <p className="mt-1 text-sm capitalize text-slate">
                  {day.status.replaceAll("_", " ")}
                  {day.capacity_jobs
                    ? ` · ${day.capacity_jobs} job capacity`
                    : ""}
                  {day.notes ? ` · ${day.notes}` : ""}
                </p>
              </div>
              <form action={removeAvailability}>
                <input type="hidden" name="day" value={day.id} />
                <button className="rounded-xl border px-3 py-2 text-sm font-bold">
                  Remove exception
                </button>
              </form>
            </article>
          ))}
          {!days?.length && (
            <p className="rounded-2xl border bg-white p-8 text-slate">
              No date-specific availability exceptions.
            </p>
          )}
        </div>
      </section>
    </RoleShell>
  );
}
