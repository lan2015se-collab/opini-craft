import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth-hook";
import { randomId } from "@/lib/auth-hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/new")({
  head: () => ({ meta: [{ title: "新增表單 — OpiniCraft" }] }),
  component: NewForm,
});

type QType = "text" | "phone" | "instagram" | "threads" | "email" | "select" | "multiselect";

const TYPE_LABELS: Record<QType, string> = {
  text: "輸入框",
  phone: "電話號碼",
  instagram: "Instagram ID",
  threads: "Threads ID",
  email: "電子郵件",
  select: "選擇",
  multiselect: "複選",
};

type Question = { id: string; label: string; qtype: QType; options: string[] };

function NewForm() {
  const session = useSession();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<"build" | "completion">("build");
  const [completion, setCompletion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session === null) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  const addQ = () => setQuestions((q) => [...q, { id: crypto.randomUUID(), label: "", qtype: "text", options: [] }]);
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeQ = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));

  const goNext = () => {
    for (const q of questions) {
      if (!q.label.trim()) return toast.error("每個問題都需要標題");
      if ((q.qtype === "select" || q.qtype === "multiselect") && q.options.filter((o) => o.trim()).length < 2) {
        return toast.error("選擇/複選需至少 2 個選項");
      }
    }
    setStep("completion");
  };

  const create = async () => {
    if (!completion.trim()) return toast.error("請輸入完成頁面顯示文字");
    if (!session) return;
    setSaving(true);
    let id = randomId();
    // ensure unique
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from("forms").select("id").eq("id", id).maybeSingle();
      if (!data) break;
      id = randomId();
    }
    const { error } = await supabase.from("forms").insert({
      id,
      owner_id: session.user.id,
      title: title.trim() || "未命名表單",
      completion_message: completion.trim(),
    });
    if (error) { toast.error(error.message); setSaving(false); return; }

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
    toast.success(`建立成功：/forms/${id}`);
    navigate({ to: "/dashboard" });
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard"><ArrowLeft className="size-4" /></Link>
          </Button>
          <h1 className="text-lg font-semibold">{step === "build" ? "建立表單" : "完成頁面"}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {step === "build" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="t">表單名稱（選填）</Label>
              <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：粉絲投稿" />
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-2xl border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">問題 {idx + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeQ(q.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="問題標題"
                    value={q.label}
                    onChange={(e) => updateQ(q.id, { label: e.target.value })}
                  />
                  <Select value={q.qtype} onValueChange={(v) => updateQ(q.id, { qtype: v as QType, options: [] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as QType[]).map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(q.qtype === "select" || q.qtype === "multiselect") && (
                    <div className="space-y-2">
                      {q.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={opt}
                            placeholder={`選項 ${i + 1}`}
                            onChange={(e) => {
                              const next = [...q.options]; next[i] = e.target.value;
                              updateQ(q.id, { options: next });
                            }}
                          />
                          <Button variant="ghost" size="icon" onClick={() => {
                            updateQ(q.id, { options: q.options.filter((_, j) => j !== i) });
                          }}><Trash2 className="size-4" /></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => updateQ(q.id, { options: [...q.options, ""] })}>
                        <Plus className="size-4" /> 新增選項
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addQ} className="w-full">
              <Plus className="size-4" /> 新增問題
            </Button>

            <Button onClick={goNext} className="w-full" size="lg">完成</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c">完成頁面顯示區域</Label>
              <Textarea
                id="c"
                rows={6}
                value={completion}
                onChange={(e) => setCompletion(e.target.value)}
                placeholder="填完後顯示給填寫者的訊息，例如：謝謝你的投稿！我會盡快私訊回覆 ✨"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("build")} className="flex-1">返回</Button>
              <Button onClick={create} disabled={saving} className="flex-1">
                {saving ? "建立中…" : "建立"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}