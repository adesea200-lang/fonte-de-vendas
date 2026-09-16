import { createFileRoute } from "@tanstack/react-router";

import { Catalog } from "@/components/store/Catalog";
import { StoreLayout } from "@/components/store/StoreLayout";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos | Fonte das Peitas" },
      {
        name: "description",
        content: "Catálogo completo Fonte das Peitas: busque, filtre e ordene todas as peças da loja.",
      },
      { property: "og:title", content: "Produtos | Fonte das Peitas" },
      { property: "og:description", content: "Todas as peças da coleção, com busca e filtros." },
    ],
  }),
  component: () => (
    <StoreLayout>
      <Catalog title="Todos os produtos" />
    </StoreLayout>
  ),
});
