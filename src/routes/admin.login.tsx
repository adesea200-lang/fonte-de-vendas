import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/logo.png.asset.json";
import { reivindicarAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso administrativo | Fonte das Peitas" },
      { name: "description", content: "Área restrita para administradores da loja Fonte das Peitas." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acesso administrativo" },
      { property: "og:description", content: "Área restrita da loja." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const claim = useServerFn(reivindicarAdmin);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      const { granted } = await claim({ data: undefined });
      if (!granted) {
        await supabase.auth.signOut();
        toast.error("Esta conta não tem permissão de administrador.");
        return;
      }
      toast.success("Bem-vindo de volta.");
      navigate({ to: "/admin" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível entrar.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <img src={logo.url} alt="Fonte das Peitas" className="mx-auto mb-8 h-14 w-auto" />
        <div className="rounded-xl border border-border bg-surface p-6">
          <h1 className="mb-1 flex items-center gap-2 text-lg">
            <Lock className="size-4 text-gold" /> Painel administrativo
          </h1>
          <p className="mb-6 text-xs text-foreground/40">
            {mode === "login" ? "Entre com sua conta autorizada." : "Crie a conta do primeiro administrador."}
          </p>

          <label className="mb-4 block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-foreground/40">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </label>
          <label className="mb-6 block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-foreground/40">Senha</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 bg-gold px-6 py-4 text-xs font-bold uppercase tracking-widest text-background disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Entrar" : "Criar conta e entrar"}
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
            className="mt-4 w-full text-center text-[11px] uppercase tracking-widest text-foreground/40 hover:text-gold"
          >
            {mode === "login" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
          </button>
        </div>
      </form>
    </div>
  );
}
