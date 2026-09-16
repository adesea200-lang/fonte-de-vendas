import { createFileRoute } from "@tanstack/react-router";

import { Catalog } from "@/components/store/Catalog";
import { StoreLayout } from "@/components/store/StoreLayout";

export const Route = createFileRoute("/busca")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Busca | Fonte das Peitas" },
      { name: "description", content: "Encontre peças da Fonte das Peitas por nome, categoria ou descrição." },
      { property: "og:title", content: "Busca | Fonte das Peitas" },
      { property: "og:description", content: "Busque no catálogo completo da loja." },
    ],
  }),
  component: BuscaPage,
});

function BuscaPage() {
  const { q } = Route.useSearch();
  return (
    <StoreLayout>
      <Catalog key={q} title="Buscar" initialSearch={q} />
    </StoreLayout>
  );
}
