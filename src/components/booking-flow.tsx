"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Info,
  Trash2,
} from "lucide-react";
import {
  BookingDraft,
  emptyDraft,
  MAX_PHOTOS,
  ServiceKind,
  validPhoto,
  validateBooking,
} from "@/lib/booking";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useToast } from "./toast";

const moveSteps = [
  "Locations",
  "Schedule",
  "Job details",
  "Access & photos",
  "Contact",
  "Review",
];
const removeSteps = [
  "Location",
  "Schedule",
  "Items",
  "Access & photos",
  "Contact",
  "Review",
];
const fieldClass = "field";
export function BookingFlow({ service }: { service: ServiceKind }) {
  const steps = service === "move" ? moveSteps : removeSteps;
  const storageKey = `muber:${service}:draft:v1`;
  const idemKey = `${storageKey}:idempotency`;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => emptyDraft(service));
  const [files, setFiles] = useState<File[]>([]);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved)
          setDraft({ ...emptyDraft(service), ...JSON.parse(saved), service });
      } catch {}
      setReady(true);
    });
  }, [service, storageKey]);
  useEffect(() => {
    if (ready) localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, ready, storageKey]);
  const set = (
    key: keyof BookingDraft,
    value: BookingDraft[keyof BookingDraft],
  ) => setDraft((d) => ({ ...d, [key]: value }));
  const next = () => {
    setErrors({});
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submit = async () => {
    const found = validateBooking(draft);
    if (Object.keys(found).length) {
      setErrors(found);
      toast("Review the highlighted required fields.");
      return;
    }
    setBusy(true);
    try {
      let key = localStorage.getItem(idemKey);
      if (!key) {
        key = crypto.randomUUID();
        localStorage.setItem(idemKey, key);
      }
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft, idempotencyKey: key }),
      });
      if (response.status === 401) {
        router.push(
          `/customer/login?next=${encodeURIComponent(location.pathname)}`,
        );
        return;
      }
      if (!response.ok) throw new Error("Request could not be saved");
      const result = (await response.json()) as {
        job_id: string;
        job_reference: string;
      };
      if (files.length) {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Session expired");
        for (const file of files) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const path = `${user.id}/${result.job_id}/${crypto.randomUUID()}.${ext}`;
          const uploaded = await supabase.storage
            .from("job-media")
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploaded.error) throw new Error("A photo could not be uploaded");
          const attached = await fetch(`/api/bookings/${result.job_id}/media`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ path, mime: file.type, size: file.size }),
          });
          if (!attached.ok) throw new Error("A photo could not be attached");
        }
      }
      localStorage.removeItem(storageKey);
      localStorage.removeItem(idemKey);
      setSubmitted(result.job_reference);
      toast("Request submitted for MUBER review.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Request could not be saved");
    } finally {
      setBusy(false);
    }
  };
  const photos = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    const accepted = incoming
      .filter(validPhoto)
      .slice(0, MAX_PHOTOS - files.length);
    setFiles((current) => [...current, ...accepted]);
    set("photos", [...draft.photos, ...accepted.map((f) => f.name)]);
    if (accepted.length < incoming.length)
      toast("Some photos were skipped. Use JPG, PNG, or WebP under 10 MB.");
  };
  if (!ready)
    return (
      <div
        className="card h-80 animate-pulse"
        role="status"
        aria-label="Loading saved draft"
      />
    );
  if (submitted)
    return (
      <section className="card text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
          <Check size={32} />
        </span>
        <p className="eyebrow mt-6">Request received</p>
        <h2 className="mt-2 text-3xl font-black">
          MUBER will review the details.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-slate">
          Reference <strong>{submitted}</strong> is saved. Quotes and provider
          assignment happen only after review.
        </p>
        <Link href="/customer" className="btn-navy mt-8">
          View my requests
        </Link>
      </section>
    );
  return (
    <section>
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
          <span>
            Step {step + 1} of {steps.length}
          </span>
          <span className={service === "move" ? "text-navy" : "text-orange"}>
            {steps[step]}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/10">
          <div
            className={`h-full transition-all ${service === "move" ? "bg-navy" : "bg-orange"}`}
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="card min-h-[420px]">
        <Step
          service={service}
          step={step}
          draft={draft}
          set={set}
          errors={errors}
          photos={photos}
        />
      </div>
      <div className="mt-6 flex justify-between gap-3">
        {step === 0 ? (
          <Link href="/" className="btn-ghost">
            <ArrowLeft size={18} /> Home
          </Link>
        ) : (
          <button className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft size={18} /> Back
          </button>
        )}
        {step === steps.length - 1 ? (
          <button className="btn-primary" disabled={busy} onClick={submit}>
            {busy ? "Submitting…" : "Submit request"} <Check size={18} />
          </button>
        ) : (
          <button
            className={service === "move" ? "btn-navy" : "btn-primary"}
            onClick={next}
          >
            Continue <ArrowRight size={18} />
          </button>
        )}
      </div>
      <p className="mt-5 flex items-center gap-2 text-xs text-slate">
        <Info size={15} /> Your draft stays in this browser until successful
        submission. Photos upload privately after sign-in.
      </p>
    </section>
  );
}
function Step({
  service,
  step,
  draft,
  set,
  errors,
  photos,
}: {
  service: ServiceKind;
  step: number;
  draft: BookingDraft;
  set: (k: keyof BookingDraft, v: BookingDraft[keyof BookingDraft]) => void;
  errors: Record<string, string>;
  photos: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const input = (
    key: keyof BookingDraft,
    label: string,
    placeholder: string,
    type = "text",
  ) => (
    <Field label={label} error={errors[String(key)]}>
      <input
        className={fieldClass}
        value={String(draft[key])}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </Field>
  );
  if (step === 0)
    return (
      <>
        <Title
          title={
            service === "move"
              ? "Where are you moving?"
              : "Where should we pick up?"
          }
          copy="Exact addresses stay in this local draft during Phase 1."
        />
        <div className="grid gap-5">
          {input(
            "pickup",
            service === "move" ? "Pickup address" : "Service address",
            "Street address, city, state, ZIP",
          )}
          {service === "move" &&
            input(
              "destination",
              "Destination address",
              "Street address, city, state, ZIP",
            )}
        </div>
      </>
    );
  if (step === 1)
    return (
      <>
        <Title
          title="When works best?"
          copy="Your preferred window is a request, not a confirmed appointment."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {input("date", "Preferred date", "", "date")}
          <Select
            label="Time window"
            value={draft.timeWindow}
            onChange={(v) => set("timeWindow", v)}
            options={[
              "Morning · 8–11",
              "Midday · 11–2",
              "Afternoon · 2–5",
              "Flexible",
            ]}
            error={errors.timeWindow}
          />
        </div>
      </>
    );
  if (step === 2 && service === "move")
    return (
      <>
        <Title
          title="Tell us about the move"
          copy="Structured details help MUBER review scope before quoting and assignment."
        />
        <div className="mb-7">
          <h3 className="font-black">Rooms or areas</h3>
          <p className="mt-1 text-sm text-slate">Select all that apply.</p>
          <div className="mt-3">
            <Choices
              selected={draft.rooms}
              set={(v) => set("rooms", v)}
              options={[
                "Bedroom",
                "Living room",
                "Dining room",
                "Kitchen",
                "Office",
                "Garage",
                "Storage unit",
                "Outdoor",
              ]}
            />
          </div>
        </div>
        <div className="mb-7">
          <h3 className="font-black">Common items</h3>
          <p className="mt-1 text-sm text-slate">
            Add the major items you already know about.
          </p>
          <div className="mt-3">
            <Choices
              selected={draft.moveInventory}
              set={(v) => set("moveInventory", v)}
              options={[
                "Bed",
                "Dresser",
                "Sofa",
                "Dining table",
                "Desk",
                "Television",
                "Refrigerator",
                "Washer or dryer",
                "Boxes",
                "Patio furniture",
                "Tool chest",
                "Other large item",
              ]}
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Move type"
            value={draft.moveType}
            onChange={(v) => set("moveType", v)}
            options={[
              "Apartment",
              "House",
              "Office",
              "Storage",
              "Single item",
              "Other",
            ]}
          />
          <Select
            label="Help needed"
            value={draft.truckOption}
            onChange={(v) => set("truckOption", v)}
            options={["Truck + labor", "Labor only", "Not sure"]}
          />
        </div>
        <Field label="Items and job description" error={errors.description}>
          <textarea
            className="field mt-5 min-h-32"
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Rooms, large items, packing needs, or anything else we should know"
          />
        </Field>
      </>
    );
  if (step === 2)
    return (
      <>
        <Title
          title="What needs to go?"
          copy="Select every category that applies."
        />
        <Choices
          selected={draft.categories}
          set={(v) => set("categories", v)}
          options={[
            "Furniture",
            "Appliances",
            "Mattresses",
            "Electronics",
            "Yard debris",
            "Construction debris",
            "Household clutter",
            "Other",
          ]}
        />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Select
            label="Approximate amount"
            value={draft.amount}
            onChange={(v) => set("amount", v)}
            options={[
              "A few items",
              "¼ truck",
              "½ truck",
              "¾ truck",
              "Full truck or more",
              "Not sure",
            ]}
          />
          <Select
            label="Donation or disposal"
            value={draft.disposal}
            onChange={(v) => set("disposal", v)}
            options={["Donate when practical", "Disposal", "No preference"]}
          />
        </div>
      </>
    );
  if (step === 3)
    return (
      <>
        <Title
          title="Access and photos"
          copy="Photos help reduce surprises and upload privately after sign-in."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {input(
            "access",
            "Stairs, elevator, parking, or gate access",
            "Example: 2nd floor, elevator available",
          )}
          {service === "move"
            ? input(
                "specialty",
                "Heavy or specialty items",
                "Piano, safe, artwork, etc.",
              )
            : input(
                "materials",
                "Heavy materials",
                "Concrete, dirt, tile, etc.",
              )}
          {service === "move" &&
            input("stops", "Additional stops", "Optional stop addresses")}
        </div>
        {service === "remove" && (
          <label className="mt-5 flex gap-3 rounded-2xl bg-orange/10 p-4 text-sm font-bold">
            <input
              type="checkbox"
              checked={draft.hazardousConfirmed}
              onChange={(e) => set("hazardousConfirmed", e.target.checked)}
            />
            <span>
              I confirm this request does not include chemicals, fuels,
              asbestos, biohazards, explosives, or other prohibited hazardous
              material.
            </span>
          </label>
        )}
        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy/20 p-7 font-bold hover:border-orange">
          <ImagePlus /> Add photos
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={photos}
          />
        </label>
        {draft.photos.map((p, i) => (
          <div
            key={`${p}-${i}`}
            className="mt-2 flex items-center justify-between rounded-xl bg-warm px-4 py-2 text-sm"
          >
            <span className="truncate">{p}</span>
            <button
              aria-label={`Remove ${p}`}
              onClick={() =>
                set(
                  "photos",
                  draft.photos.filter((_, x) => x !== i),
                )
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </>
    );
  if (step === 4)
    return (
      <>
        <Title
          title="How can we reach you?"
          copy="Contact details are saved only in this browser during Phase 1."
        />
        <div className="grid gap-5">
          {input("name", "Full name", "Your name")}
          {input("email", "Email", "you@example.com", "email")}
          {input("phone", "Mobile phone", "(909) 555-0123", "tel")}
        </div>
      </>
    );
  return (
    <>
      <Title
        title="Review your request"
        copy="Check the essentials before submitting for MUBER review."
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        {Object.entries({
          Service: service === "move" ? "Moving" : "Junk removal",
          Location: draft.pickup,
          Destination: service === "move" ? draft.destination : undefined,
          Date: draft.date,
          Window: draft.timeWindow,
          Contact: draft.name,
          Email: draft.email,
          Rooms:
            service === "move" && draft.rooms.length
              ? draft.rooms.join(", ")
              : undefined,
          "Major items":
            service === "move" && draft.moveInventory.length
              ? `${draft.moveInventory.length} selected`
              : undefined,
          Photos: `${draft.photos.length} selected`,
        })
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div className="rounded-2xl bg-warm p-4" key={k}>
              <dt className="text-xs font-black uppercase tracking-wider text-slate">
                {k}
              </dt>
              <dd className="mt-1 font-bold">{v}</dd>
            </div>
          ))}
      </dl>
      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          Missing or invalid: {Object.keys(errors).join(", ")}. Go back to
          complete these fields.
        </div>
      )}
    </>
  );
}
function Title({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mb-7">
      <h2 className="text-3xl font-black tracking-[-.03em]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate">{copy}</p>
    </div>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-sm font-bold text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  error?: string;
}) {
  return (
    <Field label={label} error={error}>
      <select
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select one</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
}
function Choices({
  selected,
  set,
  options,
}: {
  selected: string[];
  set: (v: string[]) => void;
  options: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          aria-pressed={selected.includes(o)}
          onClick={() =>
            set(
              selected.includes(o)
                ? selected.filter((x) => x !== o)
                : [...selected, o],
            )
          }
          className={`rounded-2xl border p-4 text-left text-sm font-bold ${selected.includes(o) ? "border-orange bg-orange text-white" : "border-navy/15 bg-white"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
