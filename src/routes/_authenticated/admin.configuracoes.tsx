import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: AdminConfiguracoes,
});

const FIELDS = [
  { key: "store_name", label: "Nome da loja" },
  { key: "logo_url", label: "Logo (URL)" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "E-mail de contato" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "address", label: "Endereço" },
  { key: "contact_info", label: "Informações de atendimento" },
  { key: "announcement", label: "Mensagem no topo da loja" },
  { key: "free_shipping_threshold", label: "Frete grátis acima de (R$)" },
] as const;

function AdminConfiguracoes() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const settings = useQuery({
    queryKey: ["admin/settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    const next: Record<string, string> = {};
    FIELDS.forEach(({ key }) => {
      const value = (settings.data as Record<string, unknown>)[key];
      next[key] = value == null ? "" : String(value);
    });
    setForm(next);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const text = (key: string) => (form[key] ?? "").trim() || null;
      const { error } = await supabase
        .from("store_settings")
        .update({
          store_name: text("store_name") ?? "Fonte das Peitas",
          logo_url: text("logo_url"),
          whatsapp: text("whatsapp"),
          email: text("email"),
          instagram: text("instagram"),
          tiktok: text("tiktok"),
          facebook: text("facebook"),
          address: text("address"),
          contact_info: text("contact_info"),
          announcement: text("announcement"),
          free_shipping_threshold:
            Number((form["free_shipping_threshold"] ?? "").replace(",", ".")) || 0,
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas.");
      queryClient.invalidateQueries({ queryKey: ["admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: () => toast.error("Não foi possível salvar as configurações."),
  });

  return (
    <AdminLayout title="Configurações">
      {settings.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="grid max-w-3xl gap-4 rounded-xl border border-border bg-surface p-5 md:grid-cols-2"
        >
          {FIELDS.map((item) => (
            <label key={item.key} className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-foreground/40">
                {item.label}
              </span>
              <input
                value={form[item.key] ?? ""}
                onChange={(event) => setForm({ ...form, [item.key]: event.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={save.isPending}
            className="mt-2 bg-gold px-8 py-3 text-xs font-bold uppercase tracking-widest text-background disabled:opacity-60 md:col-span-2"
          >
            {save.isPending ? "Salvando..." : "Salvar configurações"}
          </button>
        </form>
      )}
    </AdminLayout>
  );
}
