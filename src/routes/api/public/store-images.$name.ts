import { createFileRoute } from "@tanstack/react-router";

const SAFE_FILE_NAME = /^[a-zA-Z0-9._-]+$/;

export const Route = createFileRoute("/api/public/store-images/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!SAFE_FILE_NAME.test(params.name)) {
          return new Response("Imagem inválida", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("store-images").download(params.name);
        if (error) return new Response("Imagem não encontrada", { status: 404 });

        return new Response(data, {
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Type": data.type || "application/octet-stream",
          },
        });
      },
    },
  },
});