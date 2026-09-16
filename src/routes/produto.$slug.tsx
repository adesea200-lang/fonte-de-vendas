import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, Minus, Plus, ShoppingBag, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { EmptyState, ErrorState } from "@/components/store/states";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { finalPrice, isAvailable, productOptions, productQuery, productsQuery } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produto/$slug")({
  head: ({ params }) => {
    const nome = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `${nome} | Fonte das Peitas` },
        { name: "description", content: `${nome} — peça oficial Fonte das Peitas. Compre pelo site com frete calculado.` },
        { property: "og:title", content: `${nome} | Fonte das Peitas` },
        { property: "og:description", content: `${nome} disponível na loja Fonte das Peitas.` },
      ],
    };
  },
  component: ProdutoPage,
});

function ProdutoPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = useQuery(productQuery(slug));
  const all = useQuery(productsQuery);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const data = product.data;
  const options = useMemo(() => (data ? productOptions(data) : []), [data]);
  const gallery = useMemo(() => {
    if (!data) return [] as string[];
    return [data.image_url, ...(data.gallery ?? [])].filter(Boolean) as string[];
  }, [data]);

  if (product.isLoading) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-6xl animate-pulse px-4 py-10">
          <div className="aspect-[3/4] rounded-xl bg-surface md:aspect-[16/9]" />
        </div>
      </StoreLayout>
    );
  }

  if (product.isError) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <ErrorState />
        </div>
      </StoreLayout>
    );
  }

  if (!data) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <EmptyState
            title="Produto indisponível"
            description="Esta peça não está mais no catálogo ou foi desativada."
            action={
              <Link
                to="/produtos"
                className="border border-border px-5 py-2 text-xs font-bold uppercase tracking-widest hover:border-gold hover:text-gold"
              >
                Ver catálogo
              </Link>
            }
          />
        </div>
      </StoreLayout>
    );
  }

  const price = finalPrice(data);
  const available = isAvailable(data);
  const hasDiscount = data.sale_price != null && Number(data.sale_price) > 0;
  const related = (all.data ?? []).filter((p) => p.id !== data.id && p.category_id === data.category_id).slice(0, 4);

  function handleAdd(goToCart: boolean) {
    if (!data || !available) return;
    const missing = options.find((option) => !selected[option.name]);
    if (missing) {
      toast.error(`Escolha uma opção de ${missing.name.toLowerCase()}.`);
      return;
    }
    addItem({
      productId: data.id,
      name: data.name,
      slug: data.slug,
      price,
      imageUrl: data.image_url,
      quantity,
      stock: data.stock,
      weightGrams: data.weight_grams ?? 0,
      variations: selected,
    });
    toast.success("Produto adicionado ao carrinho.");
    if (goToCart) navigate({ to: "/carrinho" });
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link
          to="/produtos"
          className="mb-6 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-foreground/40 hover:text-gold"
        >
          <ChevronLeft className="size-4" /> Voltar ao catálogo
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface">
              {gallery[activeImage] ? (
                <img src={gallery[activeImage]} alt={data.name} className="size-full object-cover" />
              ) : null}
              {!available ? (
                <div className="absolute inset-0 grid place-items-center bg-background/60">
                  <span className="border border-foreground/40 bg-background/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]">
                    Esgotado
                  </span>
                </div>
              ) : null}
            </div>
            {gallery.length > 1 ? (
              <div className="no-scrollbar flex gap-3 overflow-x-auto">
                {gallery.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      "size-20 shrink-0 overflow-hidden rounded-lg border",
                      index === activeImage ? "border-gold" : "border-border",
                    )}
                  >
                    <img src={image} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h1 className="text-3xl leading-tight md:text-4xl">{data.name}</h1>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-3xl font-bold text-gold">{brl(price)}</span>
              {hasDiscount ? (
                <span className="pb-1 text-sm text-foreground/30 line-through">{brl(Number(data.price))}</span>
              ) : null}
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest text-foreground/40">
              {available ? `Em estoque · ${data.stock} unidades` : "Produto esgotado"}
            </p>

            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/60">
              {data.description}
            </p>

            {options.map((option) => (
              <div key={option.name} className="mt-6">
                <h3 className="mb-2 text-xs uppercase tracking-widest text-foreground/40">{option.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [option.name]: value }))}
                      className={cn(
                        "min-w-12 border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
                        selected[option.name] === value
                          ? "border-gold bg-gold text-background"
                          : "border-border text-foreground/60 hover:border-gold/60",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center border border-border">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="grid size-11 place-items-center text-foreground/60 hover:text-gold"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold">{quantity}</span>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQuantity((q) => Math.min(Math.max(data.stock, 1), q + 1))}
                  className="grid size-11 place-items-center text-foreground/60 hover:text-gold"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <span className="text-xs text-foreground/40">
                <Truck className="mr-1 inline size-4" /> Frete calculado no carrinho
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={!available}
                onClick={() => handleAdd(false)}
                className="inline-flex items-center justify-center gap-2 bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingBag className="size-4" />
                {available ? "Adicionar ao carrinho" : "Produto esgotado"}
              </button>
              <button
                type="button"
                disabled={!available}
                onClick={() => handleAdd(true)}
                className="border border-border px-8 py-4 text-xs font-bold uppercase tracking-widest transition-colors hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Comprar agora
              </button>
            </div>

            <ul className="mt-8 space-y-2 text-xs text-foreground/50">
              {["Peça oficial Fonte das Peitas", "Envio para todo o Brasil", "Troca em até 7 dias"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-gold" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl text-gold">Você também vai curtir</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {all.isLoading
                ? Array.from({ length: 4 }).map((_, index) => <ProductCardSkeleton key={index} />)
                : related.map((item) => <ProductCard key={item.id} product={item} />)}
            </div>
          </section>
        ) : null}
      </div>
    </StoreLayout>
  );
}
