import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth-hook";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Plus, LogOut, Inbox, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "儀表盤 — OpiniCraft" }] }),
  component: Dashboard,
});

type FormRow = { id: string; title: string; created_at: string };
type ResponseRow = { id: string; form_id: string; answers: Record<string, unknown>; created_at: string };

function Dashboard() {
  const session = useSession();
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);

  useEffect(() => {
    if (session === null) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  useEffect(() => {
    if (!session) return;
    supabase.from("forms").select("id,title,created_at").order("created_at", { ascending: false })
      .then(({ data }) => setForms(data ?? []));
  }, [session]);

  const openResponses = async (id: string) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    const { data } = await supabase.from("form_responses").select("*").eq("form_id", id).order("created_at", { ascending: false });
    setResponses((data ?? []) as ResponseRow[]);
  };

  const remove = async (id: string) => {
    if (!confirm("確定刪除此表單？")) return;
    const { error } = await supabase.from("forms").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setForms((f) => f.filter((x) => x.id !== id));
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/forms/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("已複製連結");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">OpiniCraft</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> 登出
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">我的表單</h2>
          <Button asChild>
            <Link to="/dashboard/new"><Plus className="size-4" /> 新增網址</Link>
          </Button>
        </div>

        {forms.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            尚未建立任何表單
          </div>
        ) : (
          <ul className="space-y-3">
            {forms.map((f) => (
              <li key={f.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{f.title || "未命名表單"}</div>
                    <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      /forms/{f.id}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyLink(f.id)}><Copy className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openResponses(f.id)}><Inbox className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                {openId === f.id && (
                  <div className="mt-4 border-t pt-4">
                    <div className="mb-2 text-sm font-medium">回覆 ({responses.length})</div>
                    {responses.length === 0 ? (
                      <div className="text-sm text-muted-foreground">尚無回覆</div>
                    ) : (
                      <ul className="space-y-2">
                        {responses.map((r) => (
                          <li key={r.id} className="rounded-lg bg-muted p-3 text-sm">
                            <div className="mb-1 text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleString()}
                            </div>
                            <pre className="whitespace-pre-wrap break-words font-sans">
                              {JSON.stringify(r.answers, null, 2)}
                            </pre>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}