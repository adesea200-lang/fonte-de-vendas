import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { brl, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  component: AdminClientes,
});

function AdminClientes() {
  const [open, setOpen] = useState<string | null>(null);

  const data = useQuery({
    queryKey: ["admin/customers"],
    queryFn: async () => {
      const [customers, orders] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id, order_number, customer_email, total, created_at, status, payment_status")
          .order("created_at", { ascending: false }),
      ]);
      if (customers.error) throw customers.error;
      if (orders.error) throw orders.error;
      return { customers: customers.data ?? [], orders: orders.data ?? [] };
    },
  });

  const customers = data.data?.customers ?? [];
  const orders = data.data?.orders ?? [];

  return (
    <AdminLayout title="Clientes">
      {data.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-foreground/40">
          Nenhum cliente cadastrado ainda. Eles aparecem aqui após o primeiro pedido.
        </p>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => {
            const meus = orders.filter((order) => order.customer_email === customer.email);
            const total = meus.reduce((sum, order) => sum + Number(order.total), 0);
            const ultimo = meus[0];
            const aberto = open === customer.id;
            return (
              <div key={customer.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => setOpen(aberto ? null : customer.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{customer.name}</span>
                    <span className="block truncate text-xs text-foreground/40">
                      {customer.email} · {customer.phone}
                    </span>
                    <span className="block text-xs text-foreground/40">
                      {meus.length} {meus.length === 1 ? "pedido" : "pedidos"}
                      {ultimo ? ` · último em ${formatDate(ultimo.created_at)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-gold">{brl(total)}</span>
                </button>
                {aberto ? (
                  <div className="divide-y divide-border border-t border-border">
                    {meus.length === 0 ? (
                      <p className="p-4 text-xs text-foreground/40">Sem pedidos registrados.</p>
                    ) : (
                      meus.map((order) => (
                        <div key={order.id} className="flex items-center justify-between gap-3 p-4 text-xs">
                          <span className="min-w-0 truncate">
                            {order.order_number} · {formatDate(order.created_at)} · {order.status}
                          </span>
                          <span className="shrink-0">{brl(Number(order.total))}</span>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
