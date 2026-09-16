import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { StoreLayout } from "@/components/store/StoreLayout";

export const Route = createFileRoute("/pedido/sucesso")({
  validateSearch: (search: Record<string, unknown>): { numero?: string | undefined } => ({
    numero: typeof search["numero"] === "string" ? search["numero"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pedido realizado | Fonte das Peitas" },
      { name: "description", content: "Seu pedido foi registrado com sucesso na Fonte das Peitas." },
      { property: "og:title", content: "Pedido realizado | Fonte das Peitas" },
      { property: "og:description", content: "Pedido confirmado." },
    ],
  }),
  component: SucessoPage,
});

function SucessoPage() {
  const { numero } = Route.useSearch();
  return (
    <StoreLayout>
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <CheckCircle2 className="mb-6 size-12 text-gold" />
        <h1 className="text-3xl text-gold">Pedido realizado!</h1>
        <p className="mt-3 text-sm text-foreground/60">
          Recebemos seu pedido e já começamos a preparar tudo. Você receberá as atualizações por e-mail
          e WhatsApp.
        </p>
        {numero ? (
          <p className="mt-6 border border-border px-6 py-3 text-sm">
            Número do pedido: <strong className="text-gold">{numero}</strong>
          </p>
        ) : null}
        <Link
          to="/produtos"
          className="mt-8 bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-background"
        >
          Continuar comprando
        </Link>
      </div>
    </StoreLayout>
  );
}
