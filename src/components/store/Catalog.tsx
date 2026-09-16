import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { EmptyState, ErrorState } from "./states";
import { categoriesQuery, finalPrice, productsQuery, type Product } from "@/lib/shop";
import { cn } from "@/lib/utils";

export type CatalogSort = "recentes" | "menor-preco" | "maior-preco" | "nome";

const PAGE_SIZE = 8;

function matches(product: Product, term: string, categoryName?: string) {
  if (!term) return true;
  const haystack = [
    product.name,
    product.description,
    product.subcategory ?? "",
    categoryName ?? "",
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function Catalog({
  title,
  initialSearch = "",
  fixedCategorySlug,
  showSearchField = true,
}: {
  title: string;
  initialSearch?: string;
  fixedCategorySlug?: string;
  showSearchField?: boolean;
}) {
  const products = useQuery(productsQuery);
  const categories = useQuery(categoriesQuery);

  const [term, setTerm] = useState(initialSearch);
  const [categorySlug, setCategorySlug] = useState<string | null>(fixedCategorySlug ?? null);
  const [sort, setSort] = useState<CatalogSort>("recentes");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  );

  const filtered = useMemo(() => {
    const list = (products.data ?? []).filter((product) => {
      const category = product.category_id ? categoryById.get(product.category_id) : undefined;
      if (categorySlug && category?.slug !== categorySlug) return false;
      if (onlyAvailable && (product.sold_out || product.stock <= 0)) return false;
      if (onlyPromo && !(product.sale_price != null && Number(product.sale_price) > 0)) return false;
      return matches(product, term, category?.name);
    });

    const sorted = [...list];
    if (sort === "menor-preco") sorted.sort((a, b) => finalPrice(a) - finalPrice(b));
    if (sort === "maior-preco") sorted.sort((a, b) => finalPrice(b) - finalPrice(a));
    if (sort === "nome") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [products.data, categoryById, categorySlug, term, sort, onlyAvailable, onlyPromo]);

  const shown = filtered.slice(0, visible);

  if (products.isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState message="Não foi possível carregar o catálogo." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl text-gold md:text-4xl">{title}</h1>

      {showSearchField ? (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Buscar por nome, categoria ou descrição"
            className="w-full rounded-full border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-foreground/30 focus:border-gold"
          />
        </div>
      ) : null}

      {!fixedCategorySlug ? (
        <div className="no-scrollbar mb-4 flex gap-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategorySlug(null)}
            className={cn(
              "shrink-0 rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
              categorySlug === null
                ? "border-gold bg-gold text-background"
                : "border-border text-foreground/60",
            )}
          >
            Todos
          </button>
          {(categories.data ?? []).map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setCategorySlug(category.slug);
                setVisible(PAGE_SIZE);
              }}
              className={cn(
                "shrink-0 rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
                categorySlug === category.slug
                  ? "border-gold bg-gold text-background"
                  : "border-border text-foreground/60",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground/40">
          <SlidersHorizontal className="size-4" />
          Filtros
        </div>
        <button
          type="button"
          onClick={() => setOnlyAvailable((v) => !v)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs transition-colors",
            onlyAvailable ? "border-gold text-gold" : "border-border text-foreground/50",
          )}
        >
          Disponíveis
        </button>
        <button
          type="button"
          onClick={() => setOnlyPromo((v) => !v)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs transition-colors",
            onlyPromo ? "border-gold text-gold" : "border-border text-foreground/50",
          )}
        >
          Promoções
        </button>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as CatalogSort)}
          className="ml-auto rounded-full border border-border bg-surface px-4 py-2 text-xs text-foreground/70 outline-none focus:border-gold"
        >
          <option value="recentes">Mais recentes</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
          <option value="nome">Nome (A-Z)</option>
        </select>
      </div>

      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          title="Nenhum produto encontrado"
          description="Tente outro termo de busca ou remova alguns filtros para ver mais peças."
          action={
            <Link
              to="/produtos"
              className="border border-border px-5 py-2 text-xs font-bold uppercase tracking-widest hover:border-gold hover:text-gold"
            >
              Ver todos os produtos
            </Link>
          }
        />
      ) : (
        <>
          <p className="mb-4 text-xs uppercase tracking-widest text-foreground/40">
            {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {shown.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {visible < filtered.length ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="border border-border px-8 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:border-gold hover:text-gold"
              >
                Carregar mais
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
