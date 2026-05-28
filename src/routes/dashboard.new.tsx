import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, randomId } from "@/lib/auth-hook";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { FormBuilder, validateQuestions } from "@/components/FormBuilder";
import type { Question } from "@/lib/qtypes";

export const Route = createFileRoute("/dashboard/new")({
  head: () => ({ meta: [{ title: "新增表單 — OpiniCraft" }] }),
  component: NewForm,
});

function NewForm() {
  const session = useSession();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<"build" | "completion">("build");
  const [completion, setCompletion] = useState("");
  const [autoReply, setAutoReply] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (session === null) navigate({ to: "/", replace: true }); }, [session, navigate]);

  const goNext = () => {
    const err = validateQuestions(questions);
    if (err) return toast.error(err);
    setStep("completion");
  };

  const create = async (openPreview: boolean) => {
    if (!completion.trim()) return toast.error("請輸入完成頁面顯示文字");
    if (!session) return;
    setSaving(true);
    let id = randomId();
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
      auto_reply: autoReply.trim(),
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
    if (openPreview) {
      window.open(`/forms/${id}`, "_blank");
    }
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
            <FormBuilder title={title} setTitle={setTitle} questions={questions} setQuestions={setQuestions} />
            <Button onClick={goNext} className="w-full" size="lg">完成</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c">完成頁面顯示區域</Label>
              <Textarea id="c" rows={5} value={completion} onChange={(e) => setCompletion(e.target.value)}
                placeholder="填完後顯示給填寫者的訊息" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a">自動回覆訊息（選填）</Label>
              <Textarea id="a" rows={4} value={autoReply} onChange={(e) => setAutoReply(e.target.value)}
                placeholder="填寫人送出後，會自動以你的身分傳到聊天室的第一則訊息" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("build")} className="flex-1">返回</Button>
              <Button onClick={() => create(false)} disabled={saving} className="flex-1">
                {saving ? "建立中…" : "建立"}
              </Button>
            </div>
            <Button variant="secondary" onClick={() => create(true)} disabled={saving} className="w-full">
              建立並預覽填寫頁
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}