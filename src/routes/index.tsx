import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarHeart } from "lucide-react";
import { MonthCalendar } from "@/components/tolig/MonthCalendar";
import { TimeSlots } from "@/components/tolig/TimeSlots";
import { SettingsDialog } from "@/components/tolig/SettingsDialog";
import { PersonSelector } from "@/components/tolig/PersonSelector";
import { BestTimes } from "@/components/tolig/BestTimes";
import {
  PEOPLE,
  STORAGE_KEY,
  nextStatus,
  type PersonId,
  type ZoneId,
} from "@/lib/tolig";
import { useSharedSchedule } from "@/hooks/useSharedSchedule";
import { addDays, startOfMonth } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tolig — Find a time. Together." },
      {
        name: "description",
        content:
          "Tolig is a dead-simple shared scheduler for friends in different time zones. Pick who you are, mark your availability, and see the best days and times for everyone.",
      },
      { property: "og:title", content: "Tolig — Find a time. Together." },
      {
        property: "og:description",
        content:
          "Pick a day, see Finland 🇫🇮 and India 🇮🇳 times side by side, and instantly see when everyone can play.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Persisted = { primary: ZoneId; dark: boolean; me?: PersonId };

function Index() {
  const [hydrated, setHydrated] = useState(false);
  const { schedule, write } = useSharedSchedule();
  const [me, setMe] = useState<PersonId>("rasesh");
  const [primary, setPrimary] = useState<ZoneId>("fi");
  const [dark, setDark] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => addDays(new Date(), 2));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        if (parsed.primary) setPrimary(parsed.primary);
        if (typeof parsed.dark === "boolean") setDark(parsed.dark);
        if (parsed.me && PEOPLE.some((p) => p.id === parsed.me)) setMe(parsed.me);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ primary, dark, me }));
  }, [primary, dark, me, hydrated]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const cycle = (slotId: string) =>
    write(me, slotId, { status: nextStatus(schedule.statuses[slotId]?.[me]) });

  const comment = (slotId: string, text: string) => write(me, slotId, { comment: text || null });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <header className="mb-6 flex items-center gap-3 sm:mb-8">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarHeart className="size-6" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl leading-none font-semibold sm:text-3xl">Tolig</h1>
          <p className="mt-1 text-sm text-muted-foreground">Find a time. Together.</p>
        </div>
        <SettingsDialog
          dark={dark}
          onDarkChange={setDark}
          primary={primary}
          onPrimaryChange={setPrimary}
        />
      </header>

      <div className="mb-4 sm:mb-6">
        <PersonSelector me={me} onChange={setMe} />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4 sm:gap-6">
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              setMonth(startOfMonth(d));
            }}
            schedule={schedule}
            primary={primary}
          />
          <BestTimes
            schedule={schedule}
            primary={primary}
            onPick={(d) => {
              setSelected(d);
              setMonth(startOfMonth(d));
            }}
          />
        </div>
        <TimeSlots
          day={selected}
          primary={primary}
          me={me}
          onPrimaryChange={setPrimary}
          schedule={schedule}
          onCycle={cycle}
          onComment={comment}
        />
      </div>
    </main>
  );
}
