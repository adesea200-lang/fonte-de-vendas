import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

import { StoreLayout } from "@/components/store/StoreLayout";

export const Route = createFileRoute("/pedido/erro")({
  validateSearch: (search: Record<string, unknown>): { motivo?: string | undefined } => ({
    motivo: typeof search["motivo"] === "string" ? search["motivo"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Não conseguimos concluir seu pedido | Fonte das Peitas" },
      { name: "description", content: "Houve um problema ao finalizar o pedido. Veja como resolver." },
      { property: "og:title", content: "Pedido não concluído | Fonte das Peitas" },
      { property: "og:description", content: "Tente novamente ou fale com o atendimento." },
    ],
  }),
  component: ErroPage,
});

function ErroPage() {
  const { motivo } = Route.useSearch();
  return (
    <StoreLayout>
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <XCircle className="mx-auto mb-6 size-12 text-destructive" />
        <h1 className="text-3xl">Não foi dessa vez</h1>
        <p className="mt-3 text-sm text-foreground/60">
          {motivo ?? "Não conseguimos concluir seu pedido. Nenhuma cobrança foi realizada."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/carrinho"
            className="bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-background"
          >
            Revisar carrinho
          </Link>
          <Link
            to="/produtos"
            className="border border-border px-8 py-4 text-xs font-bold uppercase tracking-widest hover:border-gold hover:text-gold"
          >
            Voltar para a loja
          </Link>
        </div>
      </div>
    </StoreLayout>
  );
}
