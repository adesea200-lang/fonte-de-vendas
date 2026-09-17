import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { Banner, Category } from "@/lib/shop";

/** Grade de 4 banners clicáveis que levam para uma categoria da loja. */
export function BannerCards({
  banners,
  categories,
}: {
  banners: Banner[];
  categories: Category[];
}) {
  const cards = banners.slice(0, 4);
  if (cards.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="mb-6 text-2xl text-gold md:text-3xl">Escolha seu time</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {cards.map((card) => {
          const category = categories.find((c) => c.id === card.category_id);
          const content = (
            <>
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={card.title}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-surface" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-4">
                <h3 className="text-sm leading-tight md:text-base">{card.title}</h3>
                {card.subtitle ? (
                  <p className="mt-1 text-[11px] text-foreground/55">{card.subtitle}</p>
                ) : null}
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gold">
                  {card.button_label ?? "Ver produtos"} <ArrowUpRight className="size-3" />
                </span>
              </div>
            </>
          );

          const className =
            "group relative aspect-[3/4] overflow-hidden rounded-xl border border-border transition-colors hover:border-gold";

          return category ? (
            <Link
              key={card.id}
              to="/categoria/$slug"
              params={{ slug: category.slug }}
              className={className}
            >
              {content}
            </Link>
          ) : (
            <Link
              key={card.id}
              to={(card.button_link as "/produtos") ?? "/produtos"}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
