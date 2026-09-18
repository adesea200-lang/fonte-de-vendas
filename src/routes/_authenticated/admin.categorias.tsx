import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import type { Category } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: AdminCategorias,
});

function AdminCategorias() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  const categories = useQuery({
    queryKey: ["admin/categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin/categories"] });
    queryClient.invalidateQueries({ queryKey: ["shop"] });
  }

  const create = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 2) throw new Error("Informe o nome da categoria.");
      const { error } = await supabase.from("categories").insert({
        name: name.trim(),
        slug: slugify(name),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        sort_order: (categories.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria criada.");
      setName("");
      setImageUrl("");
      setDescription("");
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao criar."),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Category> }) => {
      const { error } = await supabase.from("categories").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria atualizada.");
      refresh();
    },
    onError: () => toast.error("Não foi possível atualizar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria excluída.");
      refresh();
    },
    onError: () => toast.error("Não foi possível excluir."),
  });

  return (
    <AdminLayout title="Categorias">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="mb-8 grid gap-4 rounded-xl border border-border bg-surface p-5 md:grid-cols-2"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome da categoria"
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
        />
        <ImageUploadField
          label="Foto da categoria"
          help="Recomendado: 1200 × 1500 px, formato vertical 4:5."
          value={imageUrl}
          onChange={(value) => setImageUrl(String(value))}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Descrição"
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 bg-gold px-6 py-3 text-xs font-bold uppercase tracking-widest text-background"
        >
          <Plus className="size-4" /> Criar
        </button>
      </form>

      {categories.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-surface" />
      ) : (
        <div className="space-y-3">
          {(categories.data ?? []).map((category) => (
            <div
              key={category.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm">{category.name}</h3>
                <p className="truncate text-xs text-foreground/40">/{category.slug}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => patch.mutate({ id: category.id, values: { active: !category.active } })}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs uppercase tracking-widest",
                    category.active ? "border-gold text-gold" : "border-border text-foreground/40",
                  )}
                >
                  {category.active ? "Ativa" : "Inativa"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const novo = prompt("Novo nome da categoria", category.name);
                    if (novo && novo.trim().length > 1) {
                      patch.mutate({ id: category.id, values: { name: novo.trim(), slug: slugify(novo) } });
                    }
                  }}
                  className="rounded-full border border-border px-4 py-2 text-xs text-foreground/60 hover:border-gold hover:text-gold"
                >
                  Renomear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Excluir a categoria “${category.name}”?`)) remove.mutate(category.id);
                  }}
                  className="rounded-full border border-border p-2 text-foreground/50 hover:border-destructive hover:text-destructive"
                  aria-label="Excluir categoria"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
