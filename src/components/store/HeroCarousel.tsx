import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import type { Banner } from "@/lib/shop";
import { cn } from "@/lib/utils";

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const slides = banners.slice(0, 3);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[index % Math.max(1, slides.length)];

  return (
    <section className="relative">
      <div className="relative h-[68vh] min-h-[440px] w-full overflow-hidden md:h-[72vh] md:min-h-[520px]">
        {slides.length === 0 ? <div className="absolute inset-0 bg-surface" /> : null}
        {slides.map((slide, i) =>
          slide.image_url ? (
            <img
              key={slide.id}
              src={slide.image_url}
              alt={slide.title}
              loading={i === 0 ? "eager" : "lazy"}
              className={cn(
                "absolute inset-0 size-full object-cover object-center transition-opacity duration-700",
                i === index ? "opacity-100" : "opacity-0",
              )}
            />
          ) : null,
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />

        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-14 pt-24">
          <span className="mb-4 w-fit border border-gold/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
            {current?.subtitle ?? "Camisas de time"}
          </span>
          <h1 className="max-w-2xl text-4xl leading-[0.95] sm:text-5xl md:text-7xl">
            {current?.title ?? "Fonte das Peitas"}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/60">
            {current?.description ?? "Camisas de time com qualidade premium e envio para todo o Brasil."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={(current?.button_link as "/produtos") ?? "/produtos"}
              className="inline-flex items-center gap-2 bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-background transition-transform hover:-translate-y-0.5"
            >
              {current?.button_label ?? "Comprar agora"}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/produtos"
              className="inline-flex items-center border border-border px-8 py-4 text-xs font-bold uppercase tracking-widest transition-colors hover:border-gold hover:text-gold"
            >
              Ver catálogo
            </Link>
          </div>

          {slides.length > 1 ? (
            <div className="mt-8 flex gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Ir para o banner ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === index ? "w-10 bg-gold" : "w-5 bg-foreground/25",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
