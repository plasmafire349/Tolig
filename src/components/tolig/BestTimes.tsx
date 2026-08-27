import { format } from "date-fns";
import { Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { bestSlots, ZONES, type Person, type Schedule, type ZoneId } from "@/lib/tolig";

type Props = {
  schedule: Schedule;
  primary: ZoneId;
  onPick: (day: Date) => void;
};

function Names({ people }: { people: Person[] }) {
  if (!people.length) return <span className="text-muted-foreground">—</span>;
  return <span className="text-foreground">{people.map((p) => p.name).join(" · ")}</span>;
}

function Counts({
  people,
  className,
  dot,
}: {
  people: Person[];
  className?: string;
  dot: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("flex items-center gap-2 text-sm font-semibold", className)}>
        <span className={cn("size-2.5 rounded-full", dot)} />
        {people.length}
      </span>
      <span className="text-xs">
        <Names people={people} />
      </span>
    </div>
  );
}

export function BestTimes({ schedule, primary, onPick }: Props) {
  const slots = bestSlots(schedule, primary, 21, 2, 4);
  const other: ZoneId = primary === "fi" ? "in" : "fi";

  return (
    <section className="rounded-3xl border bg-card p-4 shadow-soft sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <Star className="size-5 text-maybe" />
        <h2 className="text-lg font-semibold sm:text-xl">Best days &amp; times</h2>
      </header>

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No slot has at least 2 people available yet. Mark some times green to see matches here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {slots.map((slot, i) => (
            <li key={slot.id}>
              <button
                type="button"
                onClick={() => onPick(slot.day)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50",
                  i === 0
                    ? "border-available/70 bg-available-soft/50 shadow-soft sm:p-5"
                    : "bg-background/60",
                )}
              >
                {i === 0 && (
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-available px-3 py-1 text-xs font-semibold text-background">
                    <Sparkles className="size-3.5" /> Best match
                  </span>
                )}
                <p
                  className={cn(
                    "font-semibold",
                    i === 0 ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
                  )}
                >
                  {format(slot.day, "EEEE, MMM d")}
                </p>
                <p
                  className={cn(
                    "mt-0.5 tabular-nums text-muted-foreground",
                    i === 0 ? "text-base sm:text-lg" : "text-sm",
                  )}
                >
                  {slot.primaryTime} {ZONES[primary].flag} · {slot.otherTime} {ZONES[other].flag}
                  {slot.otherDayDiff === 1 && " (next day)"}
                  {slot.otherDayDiff === -1 && " (prev day)"}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Counts
                    people={slot.people.available}
                    dot="bg-available"
                    className="text-available"
                    label="available"
                  />
                  <Counts
                    people={slot.people.maybe}
                    dot="bg-maybe"
                    className="text-maybe"
                    label="maybe"
                  />
                  <Counts
                    people={slot.people.unavailable}
                    dot="bg-unavailable"
                    className="text-unavailable"
                    label="unavailable"
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
