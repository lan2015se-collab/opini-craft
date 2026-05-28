export type QType = "text" | "phone" | "instagram" | "threads" | "email" | "select" | "multiselect";

export const TYPE_LABELS: Record<QType, string> = {
  text: "輸入框",
  phone: "電話號碼",
  instagram: "Instagram ID",
  threads: "Threads ID",
  email: "電子郵件",
  select: "選擇",
  multiselect: "複選",
};

export type Question = {
  id: string;
  label: string;
  qtype: QType;
  options: string[];
};

export function formatAnswer(qtype: string, value: unknown): string {
  if (Array.isArray(value)) return value.join("、");
  const s = String(value ?? "");
  if (qtype === "instagram") return s.startsWith("@") ? s : `@${s}`;
  if (qtype === "threads") return s.startsWith("@") ? s : `@${s}`;
  return s;
}

export function buildAnswerText(
  questions: { label: string; qtype: string }[],
  answers: Record<string, unknown>,
): string {
  if (questions.length === 0) return "(無題目)";
  return questions
    .map((q) => `${q.label}：${formatAnswer(q.qtype, answers[q.label])}`)
    .join("\n");
}