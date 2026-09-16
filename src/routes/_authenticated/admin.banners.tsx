import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Banner } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: AdminBanners,
});

const EMPTY = {
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  button_label: "Comprar agora",
  button_link: "/produtos",
  sort_order: "1",
};

function AdminBanners() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);

  const banners = useQuery({
    queryKey: ["admin/banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Banner[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin/banners"] });
    queryClient.invalidateQueries({ queryKey: ["shop"] });
  }

  const save = useMutation({
    mutationFn: async () => {
      if (form.title.trim().length < 2) throw new Error("Informe o título do banner.");
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        button_label: form.button_label.trim() || null,
        button_link: form.button_link.trim() || null,
        sort_order: Number(form.sort_order) || 1,
      };
      if (editingId) {
        const { error } = await supabase.from("banners").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Banner salvo.");
      setForm({ ...EMPTY });
      setEditingId(null);
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao salvar."),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Banner> }) => {
      const { error } = await supabase.from("banners").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: () => toast.error("Não foi possível atualizar o banner."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Banner excluído.");
      refresh();
    },
    onError: () => toast.error("Não foi possível excluir."),
  });

  const field = "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold";

  return (
    <AdminLayout title="Banners">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
        className="mb-8 grid gap-4 rounded-xl border border-border bg-surface p-5 md:grid-cols-2"
      >
        <input className={field} placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={field} placeholder="Selo (ex: Coleção 2025)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        <input className={field} placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className={field} placeholder="URL da imagem" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        <input className={field} placeholder="Texto do botão" value={form.button_label} onChange={(e) => setForm({ ...form, button_label: e.target.value })} />
        <input className={field} placeholder="Link do botão (/produtos)" value={form.button_link} onChange={(e) => setForm({ ...form, button_link: e.target.value })} />
        <input className={field} placeholder="Ordem" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 bg-gold px-6 py-3 text-xs font-bold uppercase tracking-widest text-background"
        >
          <Plus className="size-4" /> {editingId ? "Salvar alterações" : "Criar banner"}
        </button>
      </form>

      {banners.isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface" />
      ) : (
        <div className="space-y-3">
          {(banners.data ?? []).map((banner) => (
            <div key={banner.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
                <img src={banner.image_url ?? ""} alt="" className="h-16 w-18 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm">{banner.title}</h3>
                  <p className="truncate text-xs text-foreground/40">
                    {banner.button_label} → {banner.button_link}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => patch.mutate({ id: banner.id, values: { active: !banner.active } })}
                      className={cn(
                        "rounded-full border px-4 py-2 text-xs uppercase tracking-widest",
                        banner.active ? "border-gold text-gold" : "border-border text-foreground/40",
                      )}
                    >
                      {banner.active ? "Ativo" : "Inativo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(banner.id);
                        setForm({
                          title: banner.title,
                          subtitle: banner.subtitle ?? "",
                          description: banner.description ?? "",
                          image_url: banner.image_url ?? "",
                          button_label: banner.button_label ?? "",
                          button_link: banner.button_link ?? "",
                          sort_order: String(banner.sort_order),
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-full border border-border px-4 py-2 text-xs text-foreground/60 hover:border-gold hover:text-gold"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir o banner “${banner.title}”?`)) remove.mutate(banner.id);
                      }}
                      className="rounded-full border border-border p-2 text-foreground/50 hover:border-destructive hover:text-destructive"
                      aria-label="Excluir banner"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
