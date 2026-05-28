import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth-hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$rid")({
  head: () => ({ meta: [{ title: "聊天 — OpiniCraft" }] }),
  component: ChatRoom,
});

type Msg = { id: string; sender: "owner" | "filler"; body: string; created_at: string };

function ChatRoom() {
  const { rid } = Route.useParams();
  const session = useSession();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const isOwner = !!session && !!ownerId && session.user.id === ownerId;
  const mySender: "owner" | "filler" = isOwner ? "owner" : "filler";

  useEffect(() => {
    (async () => {
      const { data: resp } = await supabase
        .from("form_responses")
        .select("form_id")
        .eq("id", rid)
        .maybeSingle();
      if (!resp) { setLoading(false); return; }
      const { data: f } = await supabase
        .from("forms")
        .select("owner_id,title")
        .eq("id", resp.form_id)
        .maybeSingle();
      if (f) {
        setOwnerId((f as { owner_id: string }).owner_id);
        setFormTitle((f as { title: string }).title);
      }
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("id,sender,body,created_at")
        .eq("response_id", rid)
        .order("created_at");
      setMessages((msgs ?? []) as Msg[]);
      setLoading(false);
    })();
  }, [rid]);

  useEffect(() => {
    const ch = supabase
      .channel(`chat:${rid}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `response_id=eq.${rid}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rid]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    const { data: resp } = await supabase.from("form_responses").select("form_id").eq("id", rid).maybeSingle();
    if (!resp) return toast.error("找不到對話");
    const { error } = await supabase.from("chat_messages").insert({
      response_id: rid, form_id: resp.form_id, sender: mySender, body: text,
    });
    if (error) toast.error(error.message);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">載入中…</div>;

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {isOwner && (
            <Button asChild variant="ghost" size="icon">
              <Link to="/dashboard"><ArrowLeft className="size-4" /></Link>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{formTitle || "OpiniCraft"}</div>
            <div className="text-xs text-muted-foreground">{isOwner ? "你是建立人" : "你正在私訊建立人"}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {messages.map((m) => {
            const mine = m.sender === mySender;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted",
                )}>
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="border-t bg-background p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="mx-auto flex max-w-2xl gap-2"
        >
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="輸入訊息…" />
          <Button type="submit" size="icon"><Send className="size-4" /></Button>
        </form>
      </footer>
    </div>
  );
}