import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Catalog } from "@/components/store/Catalog";
import { StoreLayout } from "@/components/store/StoreLayout";
import { categoriesQuery } from "@/lib/shop";

export const Route = createFileRoute("/categoria/$slug")({
  head: ({ params }) => {
    const nome = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `${nome} | Fonte das Peitas` },
        { name: "description", content: `Peças da categoria ${nome} na loja Fonte das Peitas.` },
        { property: "og:title", content: `${nome} | Fonte das Peitas` },
        { property: "og:description", content: `Confira os produtos da categoria ${nome}.` },
      ],
    };
  },
  component: CategoriaPage,
});

function CategoriaPage() {
  const { slug } = Route.useParams();
  const categories = useQuery(categoriesQuery);
  const category = (categories.data ?? []).find((c) => c.slug === slug);

  return (
    <StoreLayout>
      <Catalog title={category?.name ?? slug.replace(/-/g, " ")} fixedCategorySlug={slug} />
    </StoreLayout>
  );
}
