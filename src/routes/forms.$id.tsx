import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export const Route = createFileRoute("/forms/$id")({
  head: () => ({ meta: [{ title: "表單 — OpiniCraft" }] }),
  component: FillForm,
});

type Q = { id: string; label: string; qtype: string; options: string[]; position: number };
type Form = { id: string; title: string; completion_message: string };

function FillForm() {
  const { id } = Route.useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: f } = await supabase.from("forms").select("id,title,completion_message").eq("id", id).maybeSingle();
      if (!f) { setLoading(false); return; }
      setForm(f as Form);
      const { data: qs } = await supabase.from("form_questions").select("*").eq("form_id", id).order("position");
      setQuestions((qs ?? []) as Q[]);
      setLoading(false);
    })();
  }, [id]);

  const setVal = (qid: string, v: string | string[]) => setAnswers((a) => ({ ...a, [qid]: v }));

  const validate = (q: Q, val: string): string | null => {
    if (!val) return "必填";
    if (q.qtype === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "電子郵件格式錯誤";
    if (q.qtype === "phone" && !/^[+\d][\d\s\-()]{5,}$/.test(val)) return "電話號碼格式錯誤";
    if (q.qtype === "instagram" && !/^@?[a-zA-Z0-9._]{1,30}$/.test(val)) return "Instagram ID 格式錯誤";
    if (q.qtype === "threads" && !/^@?[a-zA-Z0-9._]{1,30}$/.test(val)) return "Threads ID 格式錯誤";
    return null;
  };

  const submit = async () => {
    const built: Record<string, unknown> = {};
    for (const q of questions) {
      const v = answers[q.id];
      if (q.qtype === "multiselect") {
        const arr = (v as string[]) ?? [];
        if (arr.length === 0) return toast.error(`${q.label}：請至少選一項`);
        built[q.label] = arr;
      } else {
        const sv = (v as string) ?? "";
        const err = validate(q, sv);
        if (err) return toast.error(`${q.label}：${err}`);
        built[q.label] = sv;
      }
    }
    setSubmitting(true);
    const { error } = await supabase.from("form_responses").insert({ form_id: id, answers: built as never });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">載入中…</div>;
  if (!form) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">找不到此表單</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="whitespace-pre-wrap text-lg">{form.completion_message}</div>
          <Button className="mt-6 w-full" onClick={() => window.location.reload()}>再次填寫</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{form.title || "OpiniCraft"}</h1>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          {questions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">點下方按鈕送出</p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label>{q.label}</Label>
                {q.qtype === "text" && (
                  <Input value={(answers[q.id] as string) ?? ""} onChange={(e) => setVal(q.id, e.target.value)} />
                )}
                {q.qtype === "phone" && (
                  <Input type="tel" inputMode="tel" placeholder="+886 912 345 678"
                    value={(answers[q.id] as string) ?? ""} onChange={(e) => setVal(q.id, e.target.value)} />
                )}
                {q.qtype === "email" && (
                  <Input type="email" inputMode="email" placeholder="you@example.com"
                    value={(answers[q.id] as string) ?? ""} onChange={(e) => setVal(q.id, e.target.value)} />
                )}
                {q.qtype === "instagram" && (
                  <Input placeholder="@your_ig" autoCapitalize="none"
                    value={(answers[q.id] as string) ?? ""} onChange={(e) => setVal(q.id, e.target.value)} />
                )}
                {q.qtype === "threads" && (
                  <Input placeholder="@your_threads" autoCapitalize="none"
                    value={(answers[q.id] as string) ?? ""} onChange={(e) => setVal(q.id, e.target.value)} />
                )}
                {q.qtype === "select" && (
                  <RadioGroup value={(answers[q.id] as string) ?? ""} onValueChange={(v) => setVal(q.id, v)}>
                    {q.options.map((o) => (
                      <div key={o} className="flex items-center gap-2">
                        <RadioGroupItem value={o} id={`${q.id}-${o}`} />
                        <Label htmlFor={`${q.id}-${o}`} className="font-normal">{o}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                {q.qtype === "multiselect" && (
                  <div className="space-y-2">
                    {q.options.map((o) => {
                      const arr = (answers[q.id] as string[]) ?? [];
                      const checked = arr.includes(o);
                      return (
                        <div key={o} className="flex items-center gap-2">
                          <Checkbox
                            id={`${q.id}-${o}`}
                            checked={checked}
                            onCheckedChange={(c) => {
                              const next = c ? [...arr, o] : arr.filter((x) => x !== o);
                              setVal(q.id, next);
                            }}
                          />
                          <Label htmlFor={`${q.id}-${o}`} className="font-normal">{o}</Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}

          <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
            {submitting ? "送出中…" : "送出"}
          </Button>
        </div>
      </div>
    </div>
  );
}