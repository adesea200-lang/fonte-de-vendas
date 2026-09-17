import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Copy } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { StoreLayout } from "@/components/store/StoreLayout";
import { brl } from "@/lib/format";
import { buscarPedido } from "@/lib/orders.functions";

export const Route = createFileRoute("/pedido/pendente")({
  validateSearch: (search: Record<string, unknown>): { numero?: string | undefined } => ({
    numero: typeof search["numero"] === "string" ? search["numero"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pagamento pendente | Fonte das Peitas" },
      { name: "description", content: "Seu pedido aguarda a confirmação do pagamento via Pix." },
      { property: "og:title", content: "Pagamento pendente | Fonte das Peitas" },
      { property: "og:description", content: "Conclua o pagamento para liberar o envio." },
    ],
  }),
  component: PendentePage,
});

function PendentePage() {
  const { numero } = Route.useSearch();
  const navigate = useNavigate();
  const pedido = useQuery({
    queryKey: ["pedido", numero],
    enabled: Boolean(numero),
    refetchInterval: 6000,
    queryFn: () => buscarPedido({ data: { orderNumber: numero! } }),
  });

  const aprovado = pedido.data?.payment_status === "aprovado";

  useEffect(() => {
    if (aprovado && numero) navigate({ to: "/pedido/sucesso", search: { numero } });
  }, [aprovado, numero, navigate]);

  const qr = pedido.data?.pix_qr_base64;
  const code = pedido.data?.pixCode;

  return (
    <StoreLayout>
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Clock className="mx-auto mb-6 size-12 text-gold" />
        <h1 className="text-3xl text-gold">Aguardando pagamento</h1>
        <p className="mt-3 text-sm text-foreground/60">
          Seu pedido {numero ? <strong className="text-foreground">{numero}</strong> : null} foi registrado.
          Pague o Pix abaixo — a confirmação é automática e esta página atualiza sozinha.
        </p>

        {pedido.data ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Total</span>
              <span className="font-bold text-gold">{brl(pedido.data.total)}</span>
            </div>

            {qr ? (
              <img
                src={`data:image/png;base64,${qr}`}
                alt="QR Code do Pix"
                className="mx-auto mt-5 size-56 rounded-lg bg-white p-2"
              />
            ) : null}

            {code ? (
              <>
                <p className="mt-5 text-[10px] uppercase tracking-widest text-foreground/40">Pix copia e cola</p>
                <p className="mt-2 break-all rounded-lg border border-border bg-background p-3 text-[11px] text-foreground/60">
                  {code}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    toast.success("Código Pix copiado.");
                  }}
                  className="mt-3 inline-flex items-center gap-2 border border-border px-5 py-2 text-xs font-bold uppercase tracking-widest hover:border-gold hover:text-gold"
                >
                  <Copy className="size-3.5" /> Copiar código
                </button>
              </>
            ) : (
              <p className="mt-5 text-xs text-foreground/50">
                Gerando o código Pix. Se não aparecer, fale com a loja informando o número do pedido.
              </p>
            )}
          </div>
        ) : null}

        <Link
          to="/produtos"
          className="mt-8 inline-block border border-border px-8 py-4 text-xs font-bold uppercase tracking-widest hover:border-gold hover:text-gold"
        >
          Voltar para a loja
        </Link>
      </div>
    </StoreLayout>
  );
}
