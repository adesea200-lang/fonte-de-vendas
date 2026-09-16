import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { brl, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function useDashboard() {
  return useQuery({
    queryKey: ["admin/dashboard"],
    queryFn: async () => {
      const [orders, products] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, created_at, customer_name, total, payment_status, status")
          .order("created_at", { ascending: false }),
        supabase.from("products").select("id, sold_out, stock, active"),
      ]);
      if (orders.error) throw orders.error;
      if (products.error) throw products.error;
      return { orders: orders.data ?? [], products: products.data ?? [] };
    },
  });
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[10px] uppercase tracking-widest text-foreground/40">{label}</p>
      <p className="mt-2 text-2xl text-gold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground/40">{hint}</p> : null}
    </div>
  );
}

function Dashboard() {
  const { data, isLoading, isError } = useDashboard();

  const orders = data?.orders ?? [];
  const products = data?.products ?? [];
  const vendas = orders
    .filter((order) => order.payment_status === "aprovado")
    .reduce((sum, order) => sum + Number(order.total), 0);

  return (
    <AdminLayout title="Dashboard">
      {isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar os indicadores.</p>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pedidos" value={String(orders.length)} />
            <Stat label="Vendas aprovadas" value={brl(vendas)} />
            <Stat label="Produtos cadastrados" value={String(products.length)} hint={`${products.filter((p) => !p.active).length} inativos`} />
            <Stat label="Produtos esgotados" value={String(products.filter((p) => p.sold_out || p.stock <= 0).length)} />
            <Stat label="Pagamentos pendentes" value={String(orders.filter((o) => o.payment_status === "pendente").length)} />
            <Stat label="Pagamentos aprovados" value={String(orders.filter((o) => o.payment_status === "aprovado").length)} />
            <Stat label="Pedidos enviados" value={String(orders.filter((o) => o.status === "enviado").length)} />
            <Stat label="Pedidos entregues" value={String(orders.filter((o) => o.status === "entregue").length)} />
          </div>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-widest text-foreground/50">Pedidos recentes</h2>
              <Link to="/admin/pedidos" className="text-xs uppercase tracking-widest text-gold">
                Ver todos
              </Link>
            </div>
            {orders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-foreground/40">
                Nenhum pedido registrado ainda.
              </p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {orders.slice(0, 8).map((order) => (
                  <Link
                    key={order.id}
                    to="/admin/pedidos/$id"
                    params={{ id: order.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 hover:bg-background/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{order.customer_name}</span>
                      <span className="block text-xs text-foreground/40">
                        {order.order_number} · {formatDate(order.created_at)} · {order.status}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-gold">{brl(Number(order.total))}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
}
