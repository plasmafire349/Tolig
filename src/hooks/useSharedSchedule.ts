import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MAX_COMMENT_LENGTH, type Schedule, type Status } from "@/lib/tolig";

const empty = (): Schedule => ({ statuses: {}, comments: {} });

type Row = {
  person_id: string;
  slot_id: string;
  status: string | null;
  comment: string | null;
};

function toSchedule(rows: Row[]): Schedule {
  const next = empty();
  for (const r of rows) {
    if (r.status) {
      next.statuses[r.slot_id] = {
        ...next.statuses[r.slot_id],
        [r.person_id]: r.status as Status,
      };
    }
    if (r.comment) {
      next.comments[r.slot_id] = { ...next.comments[r.slot_id], [r.person_id]: r.comment };
    }
  }
  return next;
}

/** Shared, database-backed schedule: every visitor reads and writes the same rows. */
export function useSharedSchedule() {
  const [schedule, setSchedule] = useState<Schedule>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("availability")
      .select("person_id, slot_id, status, comment");
    if (!error && data) setSchedule(toSchedule(data as Row[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel("availability-shared")
      .on("postgres_changes", { event: "*", schema: "public", table: "availability" }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const write = useCallback(
    async (personId: string, slotId: string, patch: { status?: Status | null; comment?: string | null }) => {
      // Clamp comments to the UI-enforced limit.
      if (patch.comment && patch.comment.length > MAX_COMMENT_LENGTH) {
        patch.comment = patch.comment.slice(0, MAX_COMMENT_LENGTH);
      }
      // Optimistic local update so the tap feels instant.
      setSchedule((prev) => {
        const next: Schedule = {
          statuses: { ...prev.statuses, [slotId]: { ...prev.statuses[slotId] } },
          comments: { ...prev.comments, [slotId]: { ...prev.comments[slotId] } },
        };
        if (patch.status !== undefined) {
          if (patch.status) next.statuses[slotId]![personId] = patch.status;
          else delete next.statuses[slotId]![personId];
        }
        if (patch.comment !== undefined) {
          if (patch.comment) next.comments[slotId]![personId] = patch.comment;
          else delete next.comments[slotId]![personId];
        }
        return next;
      });

      const { data: existing } = await supabase
        .from("availability")
        .select("status, comment")
        .eq("person_id", personId)
        .eq("slot_id", slotId)
        .maybeSingle();

      const status = patch.status !== undefined ? patch.status : (existing?.status ?? null);
      const comment = patch.comment !== undefined ? patch.comment : (existing?.comment ?? null);

      await supabase
        .from("availability")
        .upsert(
          { person_id: personId, slot_id: slotId, status, comment, updated_at: new Date().toISOString() },
          { onConflict: "person_id,slot_id" },
        );
      void refresh();
    },
    [refresh],
  );

  return { schedule, loading, write };
}
