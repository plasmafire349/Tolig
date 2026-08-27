CREATE TABLE public.availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id text NOT NULL,
  slot_id text NOT NULL,
  status text,
  comment text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_person_slot_unique UNIQUE (person_id, slot_id),
  CONSTRAINT availability_person_valid CHECK (person_id IN ('rasesh','kshitij','matias','jashith')),
  CONSTRAINT availability_status_valid CHECK (status IS NULL OR status IN ('available','maybe','unavailable'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability TO authenticated;
GRANT ALL ON public.availability TO service_role;

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read availability" ON public.availability FOR SELECT USING (true);
CREATE POLICY "Anyone can add availability" ON public.availability FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update availability" ON public.availability FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete availability" ON public.availability FOR DELETE USING (true);

ALTER TABLE public.availability REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability;