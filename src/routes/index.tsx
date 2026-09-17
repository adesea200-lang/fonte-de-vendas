import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Truck, Sparkles } from "lucide-react";

import { BannerCards } from "@/components/store/BannerCards";
import { HeroCarousel } from "@/components/store/HeroCarousel";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { StoreLayout } from "@/components/store/StoreLayout";
import { bannersQuery, categoriesQuery, productsQuery, settingsQuery } from "@/lib/shop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fonte das Peitas | Streetwear premium da quebrada" },
      {
        name: "description",
        content:
          "Camisetas, moletons e acessórios streetwear com identidade própria. Frete calculado na hora e compra 100% pelo site.",
      },
      { property: "og:title", content: "Fonte das Peitas | Streetwear premium" },
      {
        property: "og:description",
        content: "Peças exclusivas, tiragem limitada e entrega para todo o Brasil.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const banners = useQuery(bannersQuery);
  const products = useQuery(productsQuery);
  const categories = useQuery(categoriesQuery);
  const settings = useQuery(settingsQuery);

  const banner = (banners.data ?? [])[0];
  const featured = (products.data ?? []).filter((p) => p.featured).slice(0, 4);
  const novidades = (products.data ?? []).slice(0, 8);

  return (
    <StoreLayout>
      {settings.data?.announcement ? (
        <div className="bg-gold px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-background">
          {settings.data.announcement}
        </div>
      ) : null}

      <section className="relative">
        <div className="relative min-h-[70vh] overflow-hidden">
          {banner?.image_url ? (
            <img
              src={banner.image_url}
              alt={banner.title}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-surface" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-end px-4 pb-12 pt-24">
            <span className="mb-4 w-fit border border-gold/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
              {banner?.subtitle ?? "Coleção 2025"}
            </span>
            <h1 className="max-w-2xl text-5xl leading-[0.95] md:text-7xl">
              {banner?.title ?? "A braba do asfalto"}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/60">
              {banner?.description ??
                "Streetwear de tiragem limitada, feito pra quem carrega a rua na postura."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={(banner?.button_link as "/produtos") ?? "/produtos"}
                className="inline-flex items-center gap-2 bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-background transition-transform hover:-translate-y-0.5"
              >
                {banner?.button_label ?? "Comprar agora"}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/produtos"
                className="inline-flex items-center border border-border px-8 py-4 text-xs font-bold uppercase tracking-widest transition-colors hover:border-gold hover:text-gold"
              >
                Ver catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        {[
          { icon: Truck, title: "Frete calculado na hora", text: "Informe o CEP e escolha PAC ou SEDEX." },
          { icon: ShieldCheck, title: "Compra segura", text: "Pix ou cartão, tudo direto pelo site." },
          { icon: Sparkles, title: "Tiragem limitada", text: "Peças exclusivas, sem reposição garantida." },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-surface p-5">
            <item.icon className="mb-3 size-5 text-gold" />
            <h3 className="mb-1 text-sm">{item.title}</h3>
            <p className="text-xs text-foreground/50">{item.text}</p>
          </div>
        ))}
      </section>

      {(categories.data ?? []).length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {(categories.data ?? []).map((category) => (
              <Link
                key={category.id}
                to="/categoria/$slug"
                params={{ slug: category.slug }}
                className="shrink-0 rounded-full border border-border px-5 py-2 text-xs font-bold uppercase tracking-wider text-foreground/60 transition-colors hover:border-gold hover:text-gold"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl text-gold md:text-3xl">Destaques</h2>
          <Link to="/produtos" className="text-xs uppercase tracking-widest text-foreground/50 hover:text-gold">
            Ver tudo
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.isLoading
            ? Array.from({ length: 4 }).map((_, index) => <ProductCardSkeleton key={index} />)
            : (featured.length > 0 ? featured : novidades.slice(0, 4)).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <h2 className="mb-6 text-2xl text-gold md:text-3xl">Novidades</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.isLoading
            ? Array.from({ length: 4 }).map((_, index) => <ProductCardSkeleton key={index} />)
            : novidades.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </StoreLayout>
  );
}
