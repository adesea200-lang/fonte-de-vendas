import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { brl, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/pedidos/")({
  component: AdminPedidos,
});

const STATUS = ["todos", "novo", "preparando", "enviado", "entregue", "cancelado"] as const;

function AdminPedidos() {
  const [status, setStatus] = useState<(typeof STATUS)[number]>("todos");
  const [term, setTerm] = useState("");

  const orders = useQuery({
    queryKey: ["admin/orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, created_at, customer_name, customer_email, total, payment_status, status, city, state")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (orders.data ?? []).filter((order) => {
    if (status !== "todos" && order.status !== status) return false;
    if (!term) return true;
    const haystack = `${order.order_number} ${order.customer_name} ${order.customer_email}`.toLowerCase();
    return haystack.includes(term.toLowerCase());
  });

  return (
    <AdminLayout title="Pedidos">
      <input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Buscar por número, cliente ou e-mail"
        className="mb-4 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-gold"
      />
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {STATUS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-xs capitalize",
              status === item ? "border-gold text-gold" : "border-border text-foreground/50",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {orders.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-foreground/40">
          Nenhum pedido encontrado com esses filtros.
        </p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {filtered.map((order) => (
            <Link
              key={order.id}
              to="/admin/pedidos/$id"
              params={{ id: order.id }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 hover:bg-background/40"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm">{order.customer_name}</span>
                <span className="block truncate text-xs text-foreground/40">
                  {order.order_number} · {formatDate(order.created_at)} · {order.city}/{order.state}
                </span>
                <span className="mt-1 inline-flex gap-2 text-[10px] uppercase tracking-widest">
                  <span className="text-gold">{order.status}</span>
                  <span className="text-foreground/40">pgto: {order.payment_status}</span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-gold">{brl(Number(order.total))}</span>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
