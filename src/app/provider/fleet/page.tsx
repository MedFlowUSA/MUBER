import Link from "next/link";
import { RoleShell } from "@/components/role-shell";
import { requireOperationalRole } from "@/lib/authorization";
import { cookies } from "next/headers";
import {
  createCrew,
  createVehicle,
  inviteCrewMember,
  revokeCrewInvitation,
} from "./actions";
type Props = {
  searchParams: Promise<{
    error?: string;
    vehicle?: string;
    crew?: string;
    invited?: string;
    revoked?: string;
  }>;
};
export default async function FleetPage({ searchParams }: Props) {
  const { supabase, profile } = await requireOperationalRole(
    ["provider_owner", "provider_manager"],
    "/provider/fleet",
  );
  const params = await searchParams;
  const handoffValue = (await cookies()).get("muber_invitation_handoff")?.value;
  let invitationLink: string | null = null;
  if (params.invited && handoffValue) {
    try {
      const handoff = JSON.parse(handoffValue) as { id: string; token: string };
      invitationLink = `/crew/invite/${handoff.id}?token=${handoff.token}`;
    } catch {}
  }
  const [{ data: vehicles }, { data: crews }, { data: invites }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select(
          "id,label,vehicle_type,make,model,capacity_class,active,insurance_eligible,service_categories",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("crews")
        .select(
          "id,name,crew_size,capabilities,heavy_item_capable,moving_eligible,removal_eligible,active",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("crew_invitations")
        .select("id,crew_id,email,intended_role,status,expires_at")
        .order("created_at", { ascending: false }),
    ]);
  return (
    <RoleShell role="provider">
      <Link
        href="/provider/dashboard"
        className="text-sm font-bold text-orange-600"
      >
        ← Provider dashboard
      </Link>
      <p className="eyebrow mt-6">Operations readiness</p>
      <h1 className="mt-2 text-4xl font-black">Vehicles and crews</h1>
      {params.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
          {params.error}
        </p>
      )}
      {invitationLink && (
        <section className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="font-black">Invitation ready for secure handoff</h2>
          <p className="mt-2 text-sm text-slate-700">
            No email was sent. Copy this single-use link now and deliver it to
            the intended recipient through a trusted channel. It expires in
            seven days and cannot activate a mismatched or unverified account.
          </p>
          <input
            readOnly
            aria-label="Crew activation link"
            value={invitationLink}
            className="mt-3 w-full rounded-xl border bg-white px-3 py-3 font-mono text-xs"
          />
        </section>
      )}
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="text-2xl font-black">Add vehicle</h2>
          <form
            action={createVehicle}
            className="mt-4 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-2"
          >
            <input
              required
              name="label"
              placeholder="Internal vehicle name"
              className="rounded-xl border px-4 py-3"
            />
            <select
              required
              name="vehicle_type"
              className="rounded-xl border px-4 py-3"
            >
              <option value="">Vehicle type</option>
              {[
                "pickup_truck",
                "cargo_van",
                "box_truck",
                "moving_truck",
                "trailer",
                "dump_trailer",
                "other",
              ].map((x) => (
                <option key={x} value={x}>
                  {x.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <input
              name="make"
              placeholder="Make"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="model"
              placeholder="Model"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="model_year"
              type="number"
              min="1900"
              max="2200"
              placeholder="Year"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="plate_metadata"
              placeholder="License plate metadata"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="capacity_class"
              placeholder="Capacity class"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="cargo_dimensions"
              placeholder="Approx. cargo dimensions"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="weight_capability"
              placeholder="Weight capability"
              className="rounded-xl border px-4 py-3"
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label>
                <input type="checkbox" name="lift_gate" /> Lift gate
              </label>
              <label>
                <input type="checkbox" name="ramp" /> Ramp
              </label>
              <label>
                <input type="checkbox" name="enclosed" /> Enclosed
              </label>
            </div>
            <div className="flex gap-4 text-sm">
              <label>
                <input type="checkbox" name="service_categories" value="move" />{" "}
                Moving
              </label>
              <label>
                <input
                  type="checkbox"
                  name="service_categories"
                  value="remove"
                />{" "}
                Removal
              </label>
            </div>
            <input
              name="internal_notes"
              placeholder="Internal notes"
              className="rounded-xl border px-4 py-3"
            />
            <button className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white md:col-span-2">
              Add vehicle
            </button>
          </form>
        </section>
        <section>
          <h2 className="text-2xl font-black">Add crew</h2>
          <form
            action={createCrew}
            className="mt-4 grid gap-3 rounded-2xl border bg-white p-5"
          >
            <input
              required
              name="name"
              placeholder="Crew name"
              className="rounded-xl border px-4 py-3"
            />
            <input
              required
              name="crew_size"
              type="number"
              min="1"
              max="20"
              placeholder="Crew size"
              className="rounded-xl border px-4 py-3"
            />
            <input
              name="capabilities"
              placeholder="Capabilities, comma separated"
              className="rounded-xl border px-4 py-3"
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label>
                <input type="checkbox" name="heavy" /> Heavy items
              </label>
              <label>
                <input type="checkbox" name="moving" /> Moving
              </label>
              <label>
                <input type="checkbox" name="removal" /> Junk removal
              </label>
            </div>
            <button className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">
              Add crew
            </button>
          </form>
        </section>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="text-2xl font-black">Fleet</h2>
          <div className="mt-4 grid gap-3">
            {(vehicles || []).map((v) => (
              <article key={v.id} className="rounded-2xl border bg-white p-5">
                <div className="flex justify-between">
                  <h3 className="font-black">{v.label}</h3>
                  <span className="text-xs font-bold uppercase">
                    {v.active ? "active" : "inactive"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {v.vehicle_type.replaceAll("_", " ")} ·{" "}
                  {[v.make, v.model].filter(Boolean).join(" ") ||
                    "Details pending"}
                </p>
                <p className="mt-2 text-xs font-bold">
                  Insurance eligibility:{" "}
                  {v.insurance_eligible ? "eligible" : "not yet eligible"}
                </p>
              </article>
            ))}
            {!vehicles?.length && (
              <p className="rounded-2xl border bg-white p-6 text-slate-600">
                No vehicles added.
              </p>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-black">Crews</h2>
          <div className="mt-4 grid gap-3">
            {(crews || []).map((c) => (
              <article key={c.id} className="rounded-2xl border bg-white p-5">
                <h3 className="font-black">{c.name}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {c.crew_size} people ·{" "}
                  {[
                    c.moving_eligible && "moving",
                    c.removal_eligible && "removal",
                    c.heavy_item_capable && "heavy items",
                  ]
                    .filter(Boolean)
                    .join(", ") || "Capabilities pending"}
                </p>
                {["provider_owner", "provider_manager"].includes(
                  profile.role,
                ) && (
                  <form
                    action={inviteCrewMember}
                    className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]"
                  >
                    <input type="hidden" name="crew" value={c.id} />
                    <input
                      required
                      type="email"
                      name="email"
                      placeholder="Crew member email"
                      className="rounded-xl border px-3 py-2"
                    />
                    <select name="role" className="rounded-xl border px-3 py-2">
                      <option value="crew_member">Crew member</option>
                      <option value="crew_lead">Crew lead</option>
                    </select>
                    <button className="rounded-xl border px-3 py-2 font-bold">
                      Create pending invite
                    </button>
                  </form>
                )}
              </article>
            ))}
            {!crews?.length && (
              <p className="rounded-2xl border bg-white p-6 text-slate-600">
                No crews added.
              </p>
            )}
          </div>
          <div className="mt-6 grid gap-3">
            {(invites || []).map((invite) => (
              <article
                key={invite.id}
                className="rounded-2xl border bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{invite.email}</p>
                    <p className="text-sm text-slate-600">
                      {invite.intended_role.replaceAll("_", " ")} ·{" "}
                      {invite.status} · expires{" "}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  {invite.status === "pending" && (
                    <form action={revokeCrewInvitation}>
                      <input
                        type="hidden"
                        name="invitation"
                        value={invite.id}
                      />
                      <button className="rounded-xl border border-red-300 px-3 py-2 text-sm font-bold text-red-700">
                        Revoke
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </RoleShell>
  );
}
