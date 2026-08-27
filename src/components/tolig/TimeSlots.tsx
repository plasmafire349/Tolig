import { useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  buildSlots,
  MAX_COMMENT_LENGTH,
  PEOPLE,
  summarize,
  ZONES,

  type Schedule,
  type Status,
  type ZoneId,
} from "@/lib/tolig";

const statusStyles: Record<Status, string> = {
  available: "bg-available-soft text-available",
  maybe: "bg-maybe-soft text-maybe",
  unavailable: "bg-unavailable-soft text-unavailable",
};

const dotStyles: Record<Status, string> = {
  available: "bg-available",
  maybe: "bg-maybe",
  unavailable: "bg-unavailable",
};

const statusLabel: Record<Status, string> = {
  available: "Available",
  maybe: "Maybe",
  unavailable: "Not available",
};

type Props = {
  day: Date;
  primary: ZoneId;
  me: string;
  onPrimaryChange: (z: ZoneId) => void;
  schedule: Schedule;
  onCycle: (slotId: string) => void;
  onComment: (slotId: string, text: string) => void;
};

export function TimeSlots({ day, primary, me, onPrimaryChange, schedule, onCycle, onComment }: Props) {
  const slots = buildSlots(day, primary);
  const other: ZoneId = primary === "fi" ? "in" : "fi";
  const best = slots
    .map((s) => ({ id: s.id, ...summarize(s.id, schedule) }))
    .sort((a, b) => b.score - a.score)[0];

  return (
    <section className="rounded-3xl border bg-card p-4 shadow-soft sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">{format(day, "EEEE d MMMM")}</h2>
          <p className="text-sm text-muted-foreground">Tap a slot to set your availability — 🟢 available, 🟡 maybe, 🔴 not available</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-sm">
          {(["fi", "in"] as ZoneId[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => onPrimaryChange(z)}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors",
                primary === z
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ZONES[z].flag} {ZONES[z].label}
            </button>
          ))}
        </div>
      </header>

      <ul className="flex flex-col gap-2">
        {slots.map((slot) => {
          const mine = schedule.statuses[slot.id]?.[me];
          const s = summarize(slot.id, schedule);
          const isBest = best && best.id === slot.id && best.available > 1;
          return (
            <li
              key={slot.id}
              className={cn(
                "rounded-2xl border bg-background/60 p-3 transition-colors sm:p-4",
                isBest && "border-available/60 bg-available-soft/40",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <button
                  type="button"
                  onClick={() => onCycle(slot.id)}
                  aria-label={`Set your availability for ${slot.primaryTime} ${ZONES[primary].label}`}
                  className={cn(
                    "flex min-h-12 flex-1 items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors",
                    "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  )}
                >
                  <span className="flex flex-col leading-tight">
                    <span className="text-base font-semibold tabular-nums sm:text-lg">
                      {slot.primaryTime} {ZONES[primary].flag}
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {slot.otherTime} {ZONES[other].flag}
                      {slot.otherDayDiff === 1 && " (next day)"}
                      {slot.otherDayDiff === -1 && " (prev day)"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "ml-auto rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap",
                      mine ? statusStyles[mine] : "bg-muted text-muted-foreground",
                    )}
                  >
                    {mine ? statusLabel[mine] : "Set yours"}
                  </span>
                </button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Add a comment"
                      className={cn(
                        "size-11 shrink-0 rounded-full",
                        schedule.comments[slot.id]?.[me] && "text-primary",
                      )}
                    >
                      <MessageSquare className="size-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 rounded-2xl">
                    <CommentEditor
                      value={schedule.comments[slot.id]?.[me] ?? ""}
                      onSave={(text) => onComment(slot.id, text)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                {PEOPLE.map((p) => {
                  const st = schedule.statuses[slot.id]?.[p.id];
                  if (!st) return null;
                  const comment = schedule.comments[slot.id]?.[p.id];
                  return (
                    <span
                      key={p.id}
                      title={comment}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground"
                    >
                      <span className={cn("size-2.5 rounded-full", dotStyles[st])} />
                      <span className="font-medium text-foreground">{p.name}</span>
                      {comment && <MessageSquare className="size-3.5 text-comment" />}
                    </span>
                  );
                })}
                {(s.available > 0 || s.maybe > 0 || s.unavailable > 0) && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {s.available} available · {s.maybe} maybe · {s.unavailable} unavailable
                  </span>
                )}
                {isBest && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-available">
                    <Sparkles className="size-3.5" /> Best time
                  </span>
                )}
              </div>

              {Object.entries(schedule.comments[slot.id] ?? {}).map(([pid, text]) => (
                <p key={pid} className="mt-2 text-xs text-muted-foreground italic">
                  {PEOPLE.find((p) => p.id === pid)?.name ?? pid}: “{text}”
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CommentEditor({ value, onSave }: { value: string; onSave: (t: string) => void }) {
  const [text, setText] = useState(value);
  const overLimit = text.length > MAX_COMMENT_LENGTH;
  const trimmed = text.trim();
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        autoFocus
        value={text}
        maxLength={MAX_COMMENT_LENGTH}
        onChange={(e) => setText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
        placeholder="I can probably do 30 minutes later."
        className="min-h-20 rounded-xl"
      />
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs tabular-nums",
            overLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {text.length}/{MAX_COMMENT_LENGTH}
        </span>
        <Button
          size="sm"
          className="rounded-full"
          disabled={overLimit || trimmed === value}
          onClick={() => onSave(trimmed)}
        >
          Save comment
        </Button>
      </div>
    </div>
  );
}
