import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";

import { StoreLayout } from "@/components/store/StoreLayout";
import { EmptyState } from "@/components/store/states";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho | Fonte das Peitas" },
      { name: "description", content: "Revise as peças selecionadas e finalize sua compra na Fonte das Peitas." },
      { property: "og:title", content: "Carrinho | Fonte das Peitas" },
      { property: "og:description", content: "Revise seu pedido antes de finalizar." },
    ],
  }),
  component: CarrinhoPage,
});

function CarrinhoPage() {
  const { items, setQuantity, removeItem, subtotal, ready } = useCart();

  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-3xl text-gold md:text-4xl">Carrinho</h1>

        {!ready ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Seu carrinho está vazio"
            description="Adicione peças ao carrinho para continuar sua compra."
            action={
              <Link
                to="/produtos"
                className="bg-gold px-6 py-3 text-xs font-bold uppercase tracking-widest text-background"
              >
                Ver produtos
              </Link>
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-xl border border-border bg-surface p-4"
                >
                  <Link to="/produto/$slug" params={{ slug: item.slug }} className="shrink-0">
                    <img
                      src={item.imageUrl ?? ""}
                      alt={item.name}
                      className="size-20 rounded-lg object-cover"
                    />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold normal-case tracking-normal">{item.name}</h2>
                        {Object.entries(item.variations).length > 0 ? (
                          <p className="mt-1 text-xs text-foreground/40">
                            {Object.entries(item.variations)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label="Remover item"
                        onClick={() => removeItem(item.key)}
                        className="shrink-0 text-foreground/40 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          aria-label="Diminuir"
                          onClick={() => setQuantity(item.key, item.quantity - 1)}
                          className="grid size-9 place-items-center text-foreground/60 hover:text-gold"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Aumentar"
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                          className="grid size-9 place-items-center text-foreground/60 hover:text-gold"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="font-bold text-gold">{brl(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">Subtotal</span>
                <span className="font-bold">{brl(subtotal)}</span>
              </div>
              <p className="mt-2 text-xs text-foreground/40">
                O frete é calculado na próxima etapa, a partir do seu CEP.
              </p>
              <Link
                to="/checkout"
                className="mt-5 flex items-center justify-center bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-background"
              >
                Finalizar compra
              </Link>
              <Link
                to="/produtos"
                className="mt-3 flex items-center justify-center border border-border px-8 py-3 text-xs font-bold uppercase tracking-widest hover:border-gold hover:text-gold"
              >
                Continuar comprando
              </Link>
            </div>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
