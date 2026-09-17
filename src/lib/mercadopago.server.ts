/** Integração com o Mercado Pago (Pix e cartão via Checkout Pro). */

const API = "https://api.mercadopago.com";

export function siteUrl(): string {
  return process.env["PUBLIC_SITE_URL"] ?? "https://fonte-de-vendas.lovable.app";
}

function token(): string {
  const value = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!value) throw new Error("Pagamento indisponível no momento. Tente novamente em instantes.");
  return value;
}

async function mpFetch(path: string, init: RequestInit & { idempotencyKey?: string }) {
  const { idempotencyKey, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      ...(rest.headers as Record<string, string> | undefined),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    console.error("mercadopago_error", path, res.status, JSON.stringify(body).slice(0, 800));
    throw new Error("Não foi possível iniciar o pagamento. Tente novamente.");
  }
  return body;
}

export type PixCharge = {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string | null;
};

export async function criarPagamentoPix(input: {
  orderNumber: string;
  amount: number;
  email: string;
  name: string;
  cpf: string;
}): Promise<PixCharge> {
  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const body = await mpFetch("/v1/payments", {
    method: "POST",
    idempotencyKey: `pix-${input.orderNumber}`,
    body: JSON.stringify({
      transaction_amount: Number(input.amount.toFixed(2)),
      description: `Pedido ${input.orderNumber} - Fonte das Peitas`,
      payment_method_id: "pix",
      external_reference: input.orderNumber,
      notification_url: `${siteUrl()}/api/public/webhooks/mercadopago`,
      payer: {
        email: input.email,
        first_name: firstName ?? "Cliente",
        last_name: rest.join(" ") || "Loja",
        identification: { type: "CPF", number: input.cpf },
      },
    }),
  });

  const poi = (body["point_of_interaction"] as Record<string, unknown> | undefined) ?? {};
  const data = (poi["transaction_data"] as Record<string, unknown> | undefined) ?? {};
  return {
    paymentId: String(body["id"] ?? ""),
    qrCode: String(data["qr_code"] ?? ""),
    qrCodeBase64: String(data["qr_code_base64"] ?? ""),
    ticketUrl: typeof data["ticket_url"] === "string" ? data["ticket_url"] : null,
  };
}

export async function criarPreferenciaCartao(input: {
  orderNumber: string;
  amount: number;
  email: string;
  name: string;
  cpf: string;
}): Promise<{ preferenceId: string; initPoint: string }> {
  const body = await mpFetch("/checkout/preferences", {
    method: "POST",
    idempotencyKey: `pref-${input.orderNumber}`,
    body: JSON.stringify({
      items: [
        {
          id: input.orderNumber,
          title: `Pedido ${input.orderNumber} - Fonte das Peitas`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(input.amount.toFixed(2)),
        },
      ],
      payer: {
        email: input.email,
        name: input.name,
        identification: { type: "CPF", number: input.cpf },
      },
      external_reference: input.orderNumber,
      notification_url: `${siteUrl()}/api/public/webhooks/mercadopago`,
      back_urls: {
        success: `${siteUrl()}/pedido/sucesso?numero=${input.orderNumber}`,
        pending: `${siteUrl()}/pedido/pendente?numero=${input.orderNumber}`,
        failure: `${siteUrl()}/pedido/erro?motivo=Pagamento%20nao%20aprovado`,
      },
      auto_return: "approved",
      payment_methods: { excluded_payment_types: [{ id: "ticket" }] },
    }),
  });

  return {
    preferenceId: String(body["id"] ?? ""),
    initPoint: String(body["init_point"] ?? body["sandbox_init_point"] ?? ""),
  };
}

export async function consultarPagamento(paymentId: string) {
  const body = await mpFetch(`/v1/payments/${paymentId}`, { method: "GET" });
  return {
    id: String(body["id"] ?? paymentId),
    status: String(body["status"] ?? ""),
    externalReference:
      typeof body["external_reference"] === "string" ? body["external_reference"] : null,
  };
}

export function mapStatus(status: string): "pendente" | "aprovado" | "recusado" {
  if (status === "approved" || status === "authorized") return "aprovado";
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) return "recusado";
  return "pendente";
}
