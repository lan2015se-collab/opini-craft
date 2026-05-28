import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { TYPE_LABELS, type QType, type Question } from "@/lib/qtypes";

type Props = {
  title: string;
  setTitle: (v: string) => void;
  questions: Question[];
  setQuestions: (q: Question[] | ((prev: Question[]) => Question[])) => void;
};

export function FormBuilder({ title, setTitle, questions, setQuestions }: Props) {
  const addQ = () =>
    setQuestions((q) => [...q, { id: crypto.randomUUID(), label: "", qtype: "text", options: [] }]);
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeQ = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const move = (idx: number, dir: -1 | 1) =>
    setQuestions((q) => {
      const j = idx + dir;
      if (j < 0 || j >= q.length) return q;
      const next = [...q];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  return (
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
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(idx, 1)} disabled={idx === questions.length - 1}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeQ(q.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
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
                        const next = [...q.options];
                        next[i] = e.target.value;
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
    </div>
  );
}

export function validateQuestions(questions: Question[]): string | null {
  for (const q of questions) {
    if (!q.label.trim()) return "每個問題都需要標題";
    if ((q.qtype === "select" || q.qtype === "multiselect") && q.options.filter((o) => o.trim()).length < 2) {
      return "選擇/複選需至少 2 個選項";
    }
  }
  return null;
}