import { Link } from "@tanstack/react-router";

import { brl } from "@/lib/format";
import { finalPrice, isAvailable, type Product } from "@/lib/shop";

export function ProductCard({ product }: { product: Product }) {
  const price = finalPrice(product);
  const hasDiscount = product.sale_price != null && Number(product.sale_price) > 0;
  const available = isAvailable(product);

  return (
    <Link
      to="/produto/$slug"
      params={{ slug: product.slug }}
      className="group block animate-fade-up"
    >
      <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-surface outline outline-1 -outline-offset-1 outline-border">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-[10px] uppercase tracking-[0.15em] text-foreground/20">
            Sem imagem
          </div>
        )}
        {!available ? (
          <div className="absolute inset-0 grid place-items-center bg-background/60">
            <span className="border border-foreground/40 bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
              Esgotado
            </span>
          </div>
        ) : hasDiscount ? (
          <span className="absolute left-2 top-2 border border-gold/40 bg-background/80 px-2 py-1 text-[9px] font-bold uppercase text-gold">
            Oferta
          </span>
        ) : product.featured ? (
          <span className="absolute left-2 top-2 border border-gold/40 bg-background/80 px-2 py-1 text-[9px] font-bold uppercase text-gold">
            Destaque
          </span>
        ) : null}
      </div>
      <h3 className="mb-1 line-clamp-2 text-sm font-semibold normal-case tracking-normal">
        {product.name}
      </h3>
      <div className="flex items-center gap-2">
        <span className={available ? "font-bold text-gold" : "font-bold text-foreground/40"}>
          {brl(price)}
        </span>
        {hasDiscount ? (
          <span className="text-xs text-foreground/30 line-through">{brl(Number(product.price))}</span>
        ) : null}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 aspect-[3/4] rounded-lg bg-surface" />
      <div className="mb-2 h-3 w-3/4 rounded bg-surface" />
      <div className="h-3 w-1/3 rounded bg-surface" />
    </div>
  );
}
