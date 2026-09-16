import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  variations: z.record(z.string()).default({}),
});

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(3).max(120),
    email: z.string().trim().email().max(180),
    phone: z.string().trim().min(10).max(20),
    cpf: z.string().trim().min(11).max(14),
  }),
  address: z.object({
    zip: z.string().trim().min(8).max(9),
    street: z.string().trim().min(2).max(160),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(80).optional().default(""),
    district: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().length(2),
  }),
  items: z.array(itemSchema).min(1).max(30),
  shipping: z.object({
    price: z.number().min(0).max(1000),
    label: z.string().max(120),
  }),
  paymentMethod: z.enum(["pix", "cartao"]),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = data.items.map((i) => i.productId);
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, sale_price, image_url, stock, sold_out, active")
      .in("id", ids);
    if (productsError) throw new Error("Não foi possível validar os produtos do pedido.");

    const rows = products ?? [];
    let subtotal = 0;
    const items = data.items.map((item) => {
      const product = rows.find((p) => p.id === item.productId);
      if (!product || !product.active || product.sold_out || product.stock < item.quantity) {
        throw new Error(`Produto indisponível no estoque: ${product?.name ?? "item removido"}`);
      }
      const unitPrice =
        product.sale_price != null && Number(product.sale_price) > 0
          ? Number(product.sale_price)
          : Number(product.price);
      subtotal += unitPrice * item.quantity;
      return {
        product_id: product.id,
        product_name: product.name,
        image_url: product.image_url,
        unit_price: unitPrice,
        quantity: item.quantity,
        variations: item.variations,
      };
    });

    const shipping = Math.round(data.shipping.price * 100) / 100;
    const total = Math.round((subtotal + shipping) * 100) / 100;

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .upsert(
        {
          name: data.customer.name,
          email: data.customer.email.toLowerCase(),
          phone: data.customer.phone,
          cpf: data.customer.cpf,
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();
    if (customerError) throw new Error("Não foi possível salvar os dados do cliente.");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: customer.id,
        customer_name: data.customer.name,
        customer_email: data.customer.email.toLowerCase(),
        customer_phone: data.customer.phone,
        customer_cpf: data.customer.cpf,
        zip: data.address.zip,
        street: data.address.street,
        number: data.address.number,
        complement: data.address.complement || null,
        district: data.address.district,
        city: data.address.city,
        state: data.address.state.toUpperCase(),
        subtotal,
        shipping,
        shipping_label: data.shipping.label,
        total,
        payment_method: data.paymentMethod,
        payment_status: "pendente",
        status: "novo",
      })
      .select("id, order_number, total, payment_method")
      .single();
    if (orderError) throw new Error("Não foi possível criar o pedido. Tente novamente.");

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(items.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Não foi possível registrar os itens do pedido.");
    }

    for (const item of items) {
      const product = rows.find((p) => p.id === item.product_id);
      if (!product) continue;
      const remaining = Math.max(0, product.stock - item.quantity);
      await supabaseAdmin
        .from("products")
        .update({ stock: remaining, sold_out: remaining === 0 })
        .eq("id", product.id);
    }

    return {
      orderNumber: order.order_number,
      total: Number(order.total),
      paymentMethod: order.payment_method,
      pixCode: buildPixCode(order.order_number, Number(order.total)),
    };
  });

export const buscarPedido = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ orderNumber: z.string().trim().min(3).max(30) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "order_number, created_at, customer_name, total, subtotal, shipping, shipping_label, payment_method, payment_status, status, city, state",
      )
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (!order) return null;
    return {
      ...order,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      pixCode: buildPixCode(order.order_number, Number(order.total)),
    };
  });

/** Estrutura de código Pix copia e cola (payload estático, pronto para ser
 *  substituído pelo provedor de pagamento escolhido pela loja). */
function buildPixCode(orderNumber: string, total: number): string {
  const amount = total.toFixed(2);
  return `00020126FONTEDASPEITAS520400005303986540${amount.length}${amount}5802BR5916FONTE DAS PEITAS6009SAO PAULO62${orderNumber.length + 4}05${orderNumber.length}${orderNumber}6304`;
}
