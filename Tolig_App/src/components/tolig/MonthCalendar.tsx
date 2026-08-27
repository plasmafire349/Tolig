import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buildSlots, dayKey, summarize, type Schedule, type ZoneId } from "@/lib/tolig";

type Props = {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected: Date;
  onSelect: (d: Date) => void;
  schedule: Schedule;
  primary: ZoneId;
};

function dayActivity(day: Date, schedule: Schedule, primary: ZoneId) {
  let best = 0;
  for (const slot of buildSlots(day, primary)) {
    const { available } = summarize(slot.id, schedule);
    if (available > best) best = available;
  }
  return best;
}

export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  schedule,
  primary,
}: Props) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <section className="rounded-3xl border bg-card p-4 shadow-soft sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">{format(month, "MMMM yyyy")}</h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            className="size-10 rounded-full"
            onClick={() => onMonthChange(addMonths(month, -1))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            className="size-10 rounded-full"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </header>

      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {d.slice(0, 3)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day) => {
          const isSelected = isSameDay(day, selected);
          const outside = !isSameMonth(day, month);
          const activity = dayActivity(day, schedule, primary);
          return (
            <button
              key={dayKey(day)}
              type="button"
              onClick={() => onSelect(day)}
              aria-current={isSelected ? "date" : undefined}
              aria-label={format(day, "EEEE d MMMM yyyy")}
              className={cn(
                "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-2xl text-sm font-medium transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                outside ? "text-muted-foreground/50" : "text-foreground",
                !isSelected && "hover:bg-muted",
                isSelected && "bg-primary text-primary-foreground shadow-lift",
                !isSelected && isToday(day) && "ring-1 ring-primary/50",
              )}
            >
              <span>{format(day, "d")}</span>
              {activity > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1.5 h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-available",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
