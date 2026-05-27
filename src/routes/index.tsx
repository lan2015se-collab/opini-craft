import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OpiniCraft — 登入" },
      { name: "description", content: "為 Threads 與 Instagram 設計的私訊表單" },
    ],
  }),
  component: Index,
});

const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@opinicraft.local`;

function Index() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || password.length < 6) {
      toast.error("使用者名稱必填，密碼至少 6 碼");
      return;
    }
    setLoading(true);
    const email = usernameToEmail(username);
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() } },
      });
      if (error) toast.error(error.message);
      else {
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) toast.error(e2.message);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("登入失敗：請確認帳號密碼");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">OpiniCraft</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" ? "登入你的帳號" : "建立新帳號"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="u">使用者名稱</Label>
            <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p">密碼</Label>
            <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "處理中…" : mode === "login" ? "登入" : "註冊"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "還沒有帳號？註冊" : "已有帳號？登入"}
          </button>
        </form>
      </div>
    </div>
  );
}
