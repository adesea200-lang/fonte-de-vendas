import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { brl, formatDate } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const Route = createFileRoute("/_authenticated/admin/pedidos/$id")({
  component: AdminPedidoDetalhe,
});

function AdminPedidoDetalhe() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const pedido = useQuery({
    queryKey: ["admin/order", id],
    queryFn: async () => {
      const [order, items] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      if (order.error) throw order.error;
      if (items.error) throw items.error;
      return { order: order.data, items: items.data ?? [] };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: { status?: OrderStatus; payment_status?: PaymentStatus }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin/order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin/dashboard"] });
    },
    onError: () => toast.error("Não foi possível atualizar o pedido."),
  });

  const order = pedido.data?.order;

  return (
    <AdminLayout title={order ? `Pedido ${order.order_number}` : "Pedido"}>
      <Link
        to="/admin/pedidos"
        className="mb-6 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-foreground/40 hover:text-gold"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>

      {pedido.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
      ) : !order ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-foreground/40">
          Pedido não encontrado.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-sm uppercase tracking-widest text-gold">Itens</h2>
              <div className="space-y-3">
                {(pedido.data?.items ?? []).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block">{item.quantity}× {item.product_name}</span>
                      {item.variations && Object.keys(item.variations as object).length > 0 ? (
                        <span className="block text-xs text-foreground/40">
                          {Object.entries(item.variations as Record<string, string>)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0">{brl(Number(item.unit_price) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-foreground/60">
                  <span>Subtotal</span>
                  <span>{brl(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-foreground/60">
                  <span>Frete ({order.shipping_label})</span>
                  <span>{brl(Number(order.shipping))}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-gold">{brl(Number(order.total))}</span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 text-sm">
              <h2 className="mb-3 text-sm uppercase tracking-widest text-gold">Cliente</h2>
              <p>{order.customer_name}</p>
              <p className="text-foreground/50">{order.customer_email}</p>
              <p className="text-foreground/50">{order.customer_phone} · CPF {order.customer_cpf}</p>
              <p className="mt-3 text-foreground/50">
                {order.street}, {order.number} {order.complement ? `- ${order.complement}` : ""}
                <br />
                {order.district} · {order.city}/{order.state} · CEP {order.zip}
              </p>
              <p className="mt-3 text-xs text-foreground/35">Criado em {formatDate(order.created_at)}</p>
            </section>
          </div>

          <aside className="h-fit space-y-6 rounded-xl border border-border bg-surface p-5">
            <div>
              <h2 className="mb-3 text-sm uppercase tracking-widest text-gold">Pagamento</h2>
              <p className="mb-3 text-xs text-foreground/40">
                Método: {order.payment_method} · Status atual: {order.payment_status}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["pendente", "aprovado", "recusado"] as PaymentStatus[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update.mutate({ payment_status: value })}
                    className="border border-border px-3 py-2 text-[11px] uppercase tracking-widest hover:border-gold hover:text-gold"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-sm uppercase tracking-widest text-gold">Status do pedido</h2>
              <p className="mb-3 text-xs text-foreground/40">Status atual: {order.status}</p>
              <div className="flex flex-wrap gap-2">
                {(["novo", "preparando", "enviado", "entregue", "cancelado"] as OrderStatus[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update.mutate({ status: value })}
                    className="border border-border px-3 py-2 text-[11px] uppercase tracking-widest hover:border-gold hover:text-gold"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}
