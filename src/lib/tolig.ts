import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays, format } from "date-fns";

export const ZONES = {
  fi: { id: "fi", tz: "Europe/Helsinki", flag: "🇫🇮", label: "Finland" },
  in: { id: "in", tz: "Asia/Kolkata", flag: "🇮🇳", label: "India" },
} as const;

export type ZoneId = keyof typeof ZONES;
export type Status = "available" | "maybe" | "unavailable";

export type Person = { id: string; name: string };

/** statuses[slotUtcISO][personId] = status ; comments[slotUtcISO][personId] = text */
export type Schedule = {
  statuses: Record<string, Record<string, Status>>;
  comments: Record<string, Record<string, string>>;
};

export const PEOPLE: Person[] = [
  { id: "rasesh", name: "Rasesh" },
  { id: "kshitij", name: "Kshitij" },
  { id: "matias", name: "Matias" },
  { id: "jashith", name: "Jashith" },
];

export type PersonId = string;


export const STATUS_ORDER: Status[] = ["available", "maybe", "unavailable"];

export const nextStatus = (s?: Status): Status =>
  s === "available" ? "maybe" : s === "maybe" ? "unavailable" : "available";

export const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

/** Slots are whole hours of wall time in the primary zone. */
export function buildSlots(day: Date, primary: ZoneId, fromHour = 8, toHour = 23) {
  const tz = ZONES[primary].tz;
  const other: ZoneId = primary === "fi" ? "in" : "fi";
  const slots = [];
  for (let h = fromHour; h <= toHour; h++) {
    const wall = `${dayKey(day)} ${String(h).padStart(2, "0")}:00:00`;
    const instant = fromZonedTime(wall, tz);
    slots.push({
      id: instant.toISOString(),
      instant,
      primaryTime: formatInTimeZone(instant, tz, "HH:mm"),
      otherTime: formatInTimeZone(instant, ZONES[other].tz, "HH:mm"),
      otherDayDiff: dayDiff(instant, tz, ZONES[other].tz),
      other,
    });
  }
  return slots;
}

function dayDiff(instant: Date, tzA: string, tzB: string) {
  const a = formatInTimeZone(instant, tzA, "yyyy-MM-dd");
  const b = formatInTimeZone(instant, tzB, "yyyy-MM-dd");
  return a === b ? 0 : b > a ? 1 : -1;
}

export function summarize(slotId: string, schedule: Schedule) {
  const row = schedule.statuses[slotId] ?? {};
  const available: Person[] = [];
  const maybe: Person[] = [];
  const unavailable: Person[] = [];
  for (const p of PEOPLE) {
    const s = row[p.id];
    if (s === "available") available.push(p);
    else if (s === "maybe") maybe.push(p);
    else if (s === "unavailable") unavailable.push(p);
  }
  return {
    people: { available, maybe, unavailable },
    available: available.length,
    maybe: maybe.length,
    unavailable: unavailable.length,
    score: available.length * 2 + maybe.length,
  };
}

export type BestSlot = {
  id: string;
  day: Date;
  instant: Date;
  primaryTime: string;
  otherTime: string;
  otherDayDiff: number;
  other: ZoneId;
} & ReturnType<typeof summarize>;

/** Slots across the next `days` days with at least `minAvailable` greens. */
export function bestSlots(
  schedule: Schedule,
  primary: ZoneId,
  days = 14,
  minAvailable = 2,
  limit = 4,
): BestSlot[] {
  const today = new Date();
  const out: BestSlot[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i);
    for (const slot of buildSlots(day, primary)) {
      const s = summarize(slot.id, schedule);
      if (s.available >= minAvailable) out.push({ ...slot, day, ...s });
    }
  }
  return out
    .sort((a, b) => b.score - a.score || a.instant.getTime() - b.instant.getTime())
    .slice(0, limit);
}

export function makeDemoSchedule(): Schedule {
  const target = addDays(new Date(), 1);
  const key = dayKey(target);
  const at = (h: number) =>
    fromZonedTime(`${key} ${String(h).padStart(2, "0")}:00:00`, ZONES.fi.tz).toISOString();

  return {
    statuses: {
      [at(16)]: { rasesh: "available", kshitij: "maybe", matias: "unavailable", jashith: "unavailable" },
      [at(17)]: { rasesh: "available", kshitij: "available", matias: "maybe", jashith: "unavailable" },
      [at(18)]: { rasesh: "available", kshitij: "unavailable", matias: "maybe", jashith: "available" },
      [at(19)]: { rasesh: "maybe", kshitij: "available", matias: "available", jashith: "available" },
      [at(20)]: { rasesh: "unavailable", kshitij: "maybe", matias: "available", jashith: "available" },
    },
    comments: {
      [at(18)]: { matias: "I can probably do 30 minutes later." },
      [at(20)]: { jashith: "Only if we start on time :)" },
    },
  };
}


export const STORAGE_KEY = "tolig.v1";

/** Maximum length for a slot comment. */
export const MAX_COMMENT_LENGTH = 200;
