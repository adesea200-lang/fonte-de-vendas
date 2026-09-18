import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { supabase } from "@/integrations/supabase/client";
import { brl, slugify } from "@/lib/format";
import type { Category, Product } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: AdminProdutos,
});

type FormState = {
  name: string;
  description: string;
  price: string;
  sale_price: string;
  category_id: string;
  subcategory: string;
  image_url: string;
  gallery: string;
  stock: string;
  weight_grams: string;
  options: string;
  active: boolean;
  featured: boolean;
  sold_out: boolean;
};

const EMPTY: FormState = {
  name: "",
  description: "",
  price: "",
  sale_price: "",
  category_id: "",
  subcategory: "",
  image_url: "",
  gallery: "",
  stock: "0",
  weight_grams: "400",
  options: "Tamanho: P, M, G, GG",
  active: true,
  featured: false,
  sold_out: false,
};

function toForm(product: Product): FormState {
  const options = (product.options as Record<string, string[]> | null) ?? {};
  return {
    name: product.name,
    description: product.description ?? "",
    price: String(product.price),
    sale_price: product.sale_price != null ? String(product.sale_price) : "",
    category_id: product.category_id ?? "",
    subcategory: product.subcategory ?? "",
    image_url: product.image_url ?? "",
    gallery: (product.gallery ?? []).join("\n"),
    stock: String(product.stock),
    weight_grams: String(product.weight_grams ?? 0),
    options: Object.entries(options)
      .map(([key, values]) => `${key}: ${values.join(", ")}`)
      .join("\n"),
    active: product.active,
    featured: product.featured,
    sold_out: product.sold_out,
  };
}

function parseOptions(value: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [name, values] = line.split(":");
      if (!name || !values) return;
      const list = values
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (list.length > 0) result[name.trim()] = list;
    });
  return result;
}

function Input({
  label,
  value,
  onChange,
  textarea,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  type?: string;
  className?: string;
}) {
  const shared =
    "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold";
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-foreground/40">{label}</span>
      {textarea ? (
        <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className={shared} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={shared} />
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition-colors",
        checked ? "border-gold text-gold" : "border-border text-foreground/40",
      )}
    >
      {label}
    </button>
  );
}

function AdminProdutos() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [term, setTerm] = useState("");

  const products = useQuery({
    queryKey: ["admin/products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const categories = useQuery({
    queryKey: ["admin/categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin/products"] });
    queryClient.invalidateQueries({ queryKey: ["shop"] });
    queryClient.invalidateQueries({ queryKey: ["admin/dashboard"] });
  }

  const save = useMutation({
    mutationFn: async ({ state, product }: { state: FormState; product: Product | null }) => {
      const payload = {
        name: state.name.trim(),
        slug: slugify(state.name),
        description: state.description.trim(),
        price: Number(state.price.replace(",", ".")) || 0,
        sale_price: state.sale_price ? Number(state.sale_price.replace(",", ".")) : null,
        category_id: state.category_id || null,
        subcategory: state.subcategory.trim() || null,
        image_url: state.image_url.trim() || null,
        gallery: state.gallery
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        stock: Number(state.stock) || 0,
        weight_grams: Number(state.weight_grams) || 0,
        options: parseOptions(state.options),
        active: state.active,
        featured: state.featured,
        sold_out: state.sold_out || Number(state.stock) <= 0,
      };
      if (!payload.name) throw new Error("Informe o nome do produto.");
      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Produto salvo.");
      setForm(null);
      setEditing(null);
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto excluído.");
      refresh();
    },
    onError: () => toast.error("Não foi possível excluir o produto."),
  });

  const duplicate = useMutation({
    mutationFn: async (product: Product) => {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = product;
      const { error } = await supabase.from("products").insert({
        ...rest,
        name: `${product.name} (cópia)`,
        slug: `${product.slug}-copia-${Date.now().toString().slice(-4)}`,
        active: false,
        featured: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto duplicado.");
      refresh();
    },
    onError: () => toast.error("Não foi possível duplicar."),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: () => toast.error("Não foi possível atualizar o produto."),
  });

  const list = (products.data ?? []).filter((product) =>
    product.name.toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <AdminLayout title="Produtos">
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar produto"
          className="min-w-52 flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(EMPTY);
          }}
          className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-bold uppercase tracking-widest text-background"
        >
          <Plus className="size-4" /> Novo produto
        </button>
      </div>

      {form ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({ state: form, product: editing });
          }}
          className="mb-8 rounded-xl border border-gold/30 bg-surface p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-gold">
              {editing ? "Editar produto" : "Novo produto"}
            </h2>
            <button type="button" onClick={() => { setForm(null); setEditing(null); }} aria-label="Fechar">
              <X className="size-4 text-foreground/40" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Input label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} className="md:col-span-2" />
            <Input label="Preço (R$)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <Input label="Preço promocional" value={form.sale_price} onChange={(v) => setForm({ ...form, sale_price: v })} />
            <label className="block md:col-span-2">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-foreground/40">Categoria</span>
              <select
                value={form.category_id}
                onChange={(event) => setForm({ ...form, category_id: event.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold"
              >
                <option value="">Sem categoria</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <Input label="Subcategoria" value={form.subcategory} onChange={(v) => setForm({ ...form, subcategory: v })} />
            <Input label="Estoque" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} />
            <Input label="Descrição" textarea value={form.description} onChange={(v) => setForm({ ...form, description: v })} className="md:col-span-4" />
            <ImageUploadField
              label="Foto principal do produto"
              help="Recomendado: 1200 × 1500 px, formato vertical 4:5. Fundo limpo e camisa centralizada."
              value={form.image_url}
              onChange={(value) => setForm({ ...form, image_url: String(value) })}
              className="md:col-span-2"
            />
            <ImageUploadField
              label="Galeria do produto"
              help="Use também 1200 × 1500 px em todas as fotos para manter o catálogo uniforme."
              value={form.gallery.split("\n").filter(Boolean)}
              onChange={(value) => setForm({ ...form, gallery: Array.isArray(value) ? value.join("\n") : value })}
              multiple
              className="md:col-span-2"
            />
            <Input label="Peso (g)" value={form.weight_grams} onChange={(v) => setForm({ ...form, weight_grams: v })} />
            <Input
              label="Variações (ex: Tamanho: P, M, G)"
              textarea
              value={form.options}
              onChange={(v) => setForm({ ...form, options: v })}
              className="md:col-span-3"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Toggle label="Ativo" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
            <Toggle label="Destaque" checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} />
            <Toggle label="Esgotado" checked={form.sold_out} onChange={(v) => setForm({ ...form, sold_out: v })} />
          </div>

          <button
            type="submit"
            disabled={save.isPending}
            className="mt-5 bg-gold px-8 py-3 text-xs font-bold uppercase tracking-widest text-background disabled:opacity-60"
          >
            {save.isPending ? "Salvando..." : "Salvar produto"}
          </button>
        </form>
      ) : null}

      {products.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-foreground/40">
          Nenhum produto cadastrado. Clique em “Novo produto” para começar.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((product) => (
            <div key={product.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-4">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="size-14 shrink-0 rounded-lg bg-background" />
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-sm">{product.name}</h3>
                  <p className="text-xs text-foreground/40">
                    {brl(Number(product.sale_price ?? product.price))} · estoque {product.stock}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Toggle
                      label="Ativo"
                      checked={product.active}
                      onChange={(v) => patch.mutate({ id: product.id, values: { active: v } })}
                    />
                    <Toggle
                      label="Destaque"
                      checked={product.featured}
                      onChange={(v) => patch.mutate({ id: product.id, values: { featured: v } })}
                    />
                    <Toggle
                      label="Esgotado"
                      checked={product.sold_out}
                      onChange={(v) => patch.mutate({ id: product.id, values: { sold_out: v } })}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(product);
                        setForm(toForm(product));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs text-foreground/60 hover:border-gold hover:text-gold"
                    >
                      <Pencil className="size-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate.mutate(product)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs text-foreground/60 hover:border-gold hover:text-gold"
                    >
                      <Copy className="size-3.5" /> Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir “${product.name}”?`)) remove.mutate(product.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs text-foreground/60 hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" /> Excluir
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
