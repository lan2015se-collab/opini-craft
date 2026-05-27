
CREATE TABLE public.forms (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  completion_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT SELECT ON public.forms TO anon;
GRANT ALL ON public.forms TO service_role;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manage forms" ON public.forms FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "anyone read forms" ON public.forms FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  qtype TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_questions TO authenticated;
GRANT SELECT ON public.form_questions TO anon;
GRANT ALL ON public.form_questions TO service_role;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manage questions" ON public.form_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND f.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND f.owner_id = auth.uid()));
CREATE POLICY "anyone read questions" ON public.form_questions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.form_responses TO authenticated;
GRANT INSERT ON public.form_responses TO anon;
GRANT ALL ON public.form_responses TO service_role;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit responses" ON public.form_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "owner read responses" ON public.form_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND f.owner_id = auth.uid()));
