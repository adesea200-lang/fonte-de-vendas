import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Images,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import logo from "@/assets/logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/pedidos", label: "Pedidos", icon: Receipt },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/banners", label: "Banners", icon: Images },
  { to: "/admin/categorias", label: "Categorias", icon: Tags },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function useIsAdmin() {
  return useQuery({
    queryKey: ["admin/is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (error) return false;
      return Boolean(data);
    },
    staleTime: 60_000,
  });
}

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = useIsAdmin();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  if (isAdmin.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-10 w-40 animate-pulse rounded bg-surface" />
      </div>
    );
  }

  if (!isAdmin.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div>
          <h1 className="text-xl">Acesso restrito</h1>
          <p className="mt-2 text-sm text-foreground/50">
            Sua conta não tem permissão para acessar o painel administrativo.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-6 bg-gold px-6 py-3 text-xs font-bold uppercase tracking-widest text-background"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface p-5 md:block">
        <img src={logo.url} alt="Fonte das Peitas" className="mb-8 h-10 w-auto" />
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === item.to ? "bg-gold/10 text-gold" : "text-foreground/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="mt-8 flex items-center gap-3 px-3 py-2 text-sm text-foreground/50 hover:text-destructive"
        >
          <LogOut className="size-4" /> Sair
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/90 px-4 py-4 backdrop-blur">
          <h1 className="truncate text-xl text-gold">{title}</h1>
          <div className="flex shrink-0 items-center gap-3">
            <Link to="/" className="text-[10px] uppercase tracking-widest text-foreground/40 hover:text-gold">
              Ver loja
            </Link>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sair"
              className="text-foreground/40 hover:text-destructive md:hidden"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <nav className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs",
                pathname === item.to ? "border-gold text-gold" : "border-border text-foreground/50",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="p-4 pb-16 md:p-6">{children}</main>
      </div>
    </div>
  );
}
