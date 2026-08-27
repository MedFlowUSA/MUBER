"use client";
import { useMemo, useState } from "react";
type Interval = { start: string; end: string };
const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
type Day = (typeof days)[number];
type Schedule = Record<Day, Interval[]>;
const blank = (): Schedule => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
});
export function WeeklyHoursEditor({ initial }: { initial: unknown }) {
  const normalized = useMemo(() => {
    const base = blank();
    if (initial && typeof initial === "object" && "days" in initial) {
      const source = (initial as { days?: Record<string, unknown> }).days || {};
      for (const day of days)
        if (Array.isArray(source[day]))
          base[day] = (source[day] as Interval[])
            .slice(0, 2)
            .filter(
              (x) =>
                /^\d{2}:\d{2}$/.test(x.start) && /^\d{2}:\d{2}$/.test(x.end),
            );
    }
    return base;
  }, [initial]);
  const [schedule, setSchedule] = useState<Schedule>(normalized);
  const [sourceDay, setSourceDay] = useState<Day>("monday");
  const [selected, setSelected] = useState<Day[]>([]);
  const setOpen = (day: Day, open: boolean) =>
    setSchedule((current) => ({
      ...current,
      [day]: open
        ? current[day].length
          ? current[day]
          : [{ start: "08:00", end: "17:00" }]
        : [],
    }));
  const setValue = (
    day: Day,
    index: number,
    key: keyof Interval,
    value: string,
  ) =>
    setSchedule((current) => ({
      ...current,
      [day]: current[day].map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  const copy = () =>
    setSchedule((current) => {
      const next = { ...current };
      for (const day of selected)
        next[day] = current[sourceDay].map((x) => ({ ...x }));
      return next;
    });
  return (
    <fieldset className="md:col-span-2">
      <legend className="text-lg font-black">Weekly operating hours</legend>
      <p className="mt-1 text-sm text-slate">
        Pacific Time. Overnight and overlapping intervals are rejected.
      </p>
      <input
        type="hidden"
        name="operating_hours"
        value={JSON.stringify({
          timezone: "America/Los_Angeles",
          days: schedule,
        })}
      />
      <div className="mt-4 grid gap-3">
        {days.map((day) => (
          <section key={day} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-3 font-bold capitalize">
                <input
                  type="checkbox"
                  checked={schedule[day].length > 0}
                  onChange={(e) => setOpen(day, e.target.checked)}
                  className="size-5"
                />
                {day}
              </label>
              <span className="text-xs font-bold uppercase text-slate">
                {schedule[day].length ? "Open" : "Closed"}
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              {schedule[day].map((interval, index) => (
                <div
                  key={index}
                  className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <label className="text-sm font-bold">
                    Opens
                    <input
                      aria-label={`${day} interval ${index + 1} opens`}
                      type="time"
                      value={interval.start}
                      onChange={(e) =>
                        setValue(day, index, "start", e.target.value)
                      }
                      className="mt-1 block min-h-12 w-full rounded-xl border p-3 font-normal"
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Closes
                    <input
                      aria-label={`${day} interval ${index + 1} closes`}
                      type="time"
                      value={interval.end}
                      onChange={(e) =>
                        setValue(day, index, "end", e.target.value)
                      }
                      className="mt-1 block min-h-12 w-full rounded-xl border p-3 font-normal"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSchedule((current) => ({
                        ...current,
                        [day]: current[day].filter((_, i) => i !== index),
                      }))
                    }
                    className="min-h-12 rounded-xl border px-4 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {schedule[day].length > 0 && schedule[day].length < 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setSchedule((current) => ({
                      ...current,
                      [day]: [
                        ...current[day],
                        { start: "17:00", end: "18:00" },
                      ],
                    }))
                  }
                  className="min-h-12 rounded-xl border border-dashed font-bold"
                >
                  Add second interval
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
      <section className="mt-4 rounded-2xl bg-warm p-4">
        <h3 className="font-black">Copy one day to others</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <select
            aria-label="Source day"
            value={sourceDay}
            onChange={(e) => setSourceDay(e.target.value as Day)}
            className="min-h-12 rounded-xl border p-3 capitalize"
          >
            {days.map((day) => (
              <option key={day}>{day}</option>
            ))}
          </select>
          {days
            .filter((day) => day !== sourceDay)
            .map((day) => (
              <label
                key={day}
                className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-3 capitalize"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(day)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked
                        ? [...current, day]
                        : current.filter((x) => x !== day),
                    )
                  }
                />
                {day}
              </label>
            ))}
          <button
            type="button"
            onClick={copy}
            disabled={!selected.length}
            className="min-h-12 rounded-xl bg-navy px-4 font-bold text-white disabled:opacity-50"
          >
            Copy hours
          </button>
        </div>
      </section>
    </fieldset>
  );
}
