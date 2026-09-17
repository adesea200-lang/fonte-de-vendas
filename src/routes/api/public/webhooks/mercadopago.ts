import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          const url = new URL(request.url);
          const data = (payload["data"] as Record<string, unknown> | undefined) ?? {};
          const paymentId =
            (typeof data["id"] === "string" || typeof data["id"] === "number"
              ? String(data["id"])
              : null) ??
            url.searchParams.get("data.id") ??
            url.searchParams.get("id");
          const type = String(payload["type"] ?? url.searchParams.get("type") ?? "payment");
          if (!paymentId || (type !== "payment" && type !== "payment.updated")) {
            return new Response("ignored", { status: 200 });
          }

          const { consultarPagamento, mapStatus } = await import("@/lib/mercadopago.server");
          const payment = await consultarPagamento(paymentId);
          if (!payment.externalReference) return new Response("no reference", { status: 200 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: mapStatus(payment.status),
              payment_reference: payment.id,
              payment_provider: "mercadopago",
            })
            .eq("order_number", payment.externalReference);

          return new Response("ok", { status: 200 });
        } catch (error) {
          console.error("mercadopago_webhook_error", error);
          return new Response("error", { status: 200 });
        }
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
