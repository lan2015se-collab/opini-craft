
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS auto_reply text NOT NULL DEFAULT '';

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL,
  form_id text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('owner','filler')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_response ON public.chat_messages(response_id, created_at);

GRANT SELECT, INSERT ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read chat" ON public.chat_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone insert chat" ON public.chat_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
