import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth-hook";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { FormBuilder, validateQuestions } from "@/components/FormBuilder";
import type { Question, QType } from "@/lib/qtypes";

export const Route = createFileRoute("/dashboard/edit/$id")({
  head: () => ({ meta: [{ title: "編輯表單 — OpiniCraft" }] }),
  component: EditForm,
});

function EditForm() {
  const { id } = Route.useParams();
  const session = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [completion, setCompletion] = useState("");
  const [autoReply, setAutoReply] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (session === null) navigate({ to: "/", replace: true }); }, [session, navigate]);

  useEffect(() => {
    (async () => {
      const { data: f } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
      if (!f) { toast.error("找不到表單"); navigate({ to: "/dashboard" }); return; }
      setTitle(f.title);
      setCompletion(f.completion_message);
      setAutoReply((f as { auto_reply?: string }).auto_reply ?? "");
      const { data: qs } = await supabase.from("form_questions").select("*").eq("form_id", id).order("position");
      setQuestions((qs ?? []).map((q) => ({
        id: q.id,
        label: q.label,
        qtype: q.qtype as QType,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
      })));
      setLoading(false);
    })();
  }, [id, navigate]);

  const save = async () => {
    const err = validateQuestions(questions);
    if (err) return toast.error(err);
    if (!completion.trim()) return toast.error("請輸入完成頁面顯示文字");
    setSaving(true);
    const { error } = await supabase.from("forms").update({
      title: title.trim() || "未命名表單",
      completion_message: completion.trim(),
      auto_reply: autoReply.trim(),
    }).eq("id", id);
    if (error) { toast.error(error.message); setSaving(false); return; }

    await supabase.from("form_questions").delete().eq("form_id", id);
    if (questions.length > 0) {
      const rows = questions.map((q, i) => ({
        form_id: id,
        label: q.label.trim(),
        qtype: q.qtype,
        options: q.options.filter((o) => o.trim()),
        position: i,
      }));
      const { error: e2 } = await supabase.from("form_questions").insert(rows);
      if (e2) { toast.error(e2.message); setSaving(false); return; }
    }
    toast.success("已儲存");
    setSaving(false);
    navigate({ to: "/dashboard" });
  };

  if (!session || loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/dashboard"><ArrowLeft className="size-4" /></Link>
            </Button>
            <h1 className="text-lg font-semibold">編輯表單</h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`/forms/${id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> 預覽
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <FormBuilder title={title} setTitle={setTitle} questions={questions} setQuestions={setQuestions} />
        <div className="space-y-2">
          <Label htmlFor="c">完成頁面顯示區域</Label>
          <Textarea id="c" rows={4} value={completion} onChange={(e) => setCompletion(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a">自動回覆訊息（選填）</Label>
          <Textarea id="a" rows={4} value={autoReply} onChange={(e) => setAutoReply(e.target.value)}
            placeholder="填寫人送出後自動發送的訊息" />
        </div>
        <Button onClick={save} disabled={saving} className="w-full" size="lg">
          {saving ? "儲存中…" : "儲存變更"}
        </Button>
      </main>
    </div>
  );
}