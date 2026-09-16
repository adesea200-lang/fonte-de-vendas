import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2, QrCode } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { StoreLayout } from "@/components/store/StoreLayout";
import { EmptyState } from "@/components/store/states";
import { useCart } from "@/lib/cart";
import { brl, formatCep, formatCpf, formatPhone, isValidCpf, onlyDigits } from "@/lib/format";
import { criarPedido } from "@/lib/orders.functions";
import { buscarEnderecoPorCep, calcularFrete, isValidCep, type ShippingOption } from "@/lib/shipping";
import { settingsQuery } from "@/lib/shop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Fonte das Peitas" },
      { name: "description", content: "Finalize sua compra com frete calculado e pagamento por Pix ou cartão." },
      { property: "og:title", content: "Checkout | Fonte das Peitas" },
      { property: "og:description", content: "Conclua seu pedido com segurança." },
    ],
  }),
  component: CheckoutPage,
});

type Errors = Record<string, string>;

function Field({
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
  maxLength?: number;
  className?: string;
}) {
  const { className, ...input } = rest;
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-foreground/40">{label}</span>
      <input
        {...input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full rounded-lg border bg-surface px-4 py-3 text-sm outline-none transition-colors placeholder:text-foreground/25 focus:border-gold",
          error ? "border-destructive" : "border-border",
        )}
      />
      {error ? <span className="mt-1 block text-[11px] text-destructive">{error}</span> : null}
    </label>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, weightGrams, clear, ready } = useCart();
  const settings = useQuery(settingsQuery);
  const enviarPedido = useServerFn(criarPedido);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    zip: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loadingCep, setLoadingCep] = useState(false);
  const [shippingId, setShippingId] = useState<ShippingOption["id"] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cartao">("pix");
  const [submitting, setSubmitting] = useState(false);

  const threshold = Number(settings.data?.free_shipping_threshold ?? 399);
  const shippingOptions = useMemo(
    () => (isValidCep(form.zip) ? calcularFrete(form.zip, weightGrams, subtotal, threshold) : []),
    [form.zip, weightGrams, subtotal, threshold],
  );
  const shipping = shippingOptions.find((option) => option.id === shippingId) ?? shippingOptions[0];
  const total = subtotal + (shipping?.price ?? 0);

  useEffect(() => {
    const digits = onlyDigits(form.zip);
    if (digits.length !== 8) return;
    let cancelled = false;
    setLoadingCep(true);
    buscarEnderecoPorCep(digits)
      .then((address) => {
        if (cancelled || !address) return;
        setForm((prev) => ({
          ...prev,
          street: address.street || prev.street,
          district: address.district || prev.district,
          city: address.city || prev.city,
          state: address.state || prev.state,
        }));
      })
      .finally(() => {
        if (!cancelled) setLoadingCep(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.zip]);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (form.name.trim().length < 3) next["name"] = "Informe o nome completo.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next["email"] = "E-mail inválido.";
    if (onlyDigits(form.phone).length < 10) next["phone"] = "Telefone inválido.";
    if (!isValidCpf(form.cpf)) next["cpf"] = "CPF inválido.";
    if (!isValidCep(form.zip)) next["zip"] = "CEP inválido.";
    if (form.street.trim().length < 2) next["street"] = "Informe a rua.";
    if (form.number.trim().length < 1) next["number"] = "Informe o número.";
    if (form.district.trim().length < 2) next["district"] = "Informe o bairro.";
    if (form.city.trim().length < 2) next["city"] = "Informe a cidade.";
    if (form.state.trim().length !== 2) next["state"] = "UF com 2 letras.";
    if (!shipping) next["shipping"] = "Calcule o frete informando um CEP válido.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate() || !shipping) {
      toast.error("Revise os campos destacados para continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await enviarPedido({
        data: {
          customer: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: onlyDigits(form.phone),
            cpf: onlyDigits(form.cpf),
          },
          address: {
            zip: onlyDigits(form.zip),
            street: form.street.trim(),
            number: form.number.trim(),
            complement: form.complement.trim(),
            district: form.district.trim(),
            city: form.city.trim(),
            state: form.state.trim().toUpperCase(),
          },
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variations: item.variations,
          })),
          shipping: { price: shipping.price, label: shipping.label },
          paymentMethod,
        },
      });
      clear();
      if (paymentMethod === "pix") {
        navigate({ to: "/pedido/pendente", search: { numero: result.orderNumber } });
      } else {
        navigate({ to: "/pedido/sucesso", search: { numero: result.orderNumber } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao finalizar o pedido.";
      navigate({ to: "/pedido/erro", search: { motivo: message } });
    } finally {
      setSubmitting(false);
    }
  }

  if (ready && items.length === 0) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <EmptyState
            title="Nada para finalizar"
            description="Seu carrinho está vazio. Escolha suas peças antes de ir para o checkout."
            action={
              <Link
                to="/produtos"
                className="bg-gold px-6 py-3 text-xs font-bold uppercase tracking-widest text-background"
              >
                Ver produtos
              </Link>
            }
          />
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-8 text-3xl text-gold md:text-4xl">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-8">
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-sm uppercase tracking-widest text-gold">Seus dados</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome completo" value={form.name} onChange={(v) => set("name", v)} error={errors["name"]} className="md:col-span-2" />
                <Field label="E-mail" inputMode="email" value={form.email} onChange={(v) => set("email", v)} error={errors["email"]} />
                <Field label="Telefone / WhatsApp" inputMode="tel" maxLength={15} value={form.phone} onChange={(v) => set("phone", formatPhone(v))} error={errors["phone"]} />
                <Field label="CPF" inputMode="numeric" maxLength={14} value={form.cpf} onChange={(v) => set("cpf", formatCpf(v))} error={errors["cpf"]} />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm uppercase tracking-widest text-gold">
                Endereço de entrega
                {loadingCep ? <Loader2 className="size-3.5 animate-spin" /> : null}
              </h2>
              <div className="grid gap-4 md:grid-cols-6">
                <Field label="CEP" inputMode="numeric" maxLength={9} value={form.zip} onChange={(v) => set("zip", formatCep(v))} error={errors["zip"]} className="md:col-span-2" />
                <Field label="Rua" value={form.street} onChange={(v) => set("street", v)} error={errors["street"]} className="md:col-span-4" />
                <Field label="Número" value={form.number} onChange={(v) => set("number", v)} error={errors["number"]} className="md:col-span-2" />
                <Field label="Complemento" value={form.complement} onChange={(v) => set("complement", v)} className="md:col-span-4" />
                <Field label="Bairro" value={form.district} onChange={(v) => set("district", v)} error={errors["district"]} className="md:col-span-3" />
                <Field label="Cidade" value={form.city} onChange={(v) => set("city", v)} error={errors["city"]} className="md:col-span-2" />
                <Field label="UF" maxLength={2} value={form.state} onChange={(v) => set("state", v.toUpperCase())} error={errors["state"]} className="md:col-span-1" />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-sm uppercase tracking-widest text-gold">Frete</h2>
              {shippingOptions.length === 0 ? (
                <p className="text-xs text-foreground/40">
                  Informe um CEP válido para calcular o frete.
                  {errors["shipping"] ? (
                    <span className="mt-1 block text-destructive">{errors["shipping"]}</span>
                  ) : null}
                </p>
              ) : (
                <div className="space-y-3">
                  {shippingOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setShippingId(option.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                        shipping?.id === option.id ? "border-gold" : "border-border",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm">{option.id === "pac" ? "PAC" : "SEDEX"}</span>
                        <span className="block text-xs text-foreground/40">{option.label}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-gold">
                        {option.price === 0 ? "Grátis" : brl(option.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-sm uppercase tracking-widest text-gold">Pagamento</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  { id: "pix", label: "Pix", text: "Código gerado na confirmação", icon: QrCode },
                  { id: "cartao", label: "Cartão de crédito", text: "Em até 6x sem juros", icon: CreditCard },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPaymentMethod(option.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-4 text-left transition-colors",
                      paymentMethod === option.id ? "border-gold" : "border-border",
                    )}
                  >
                    <option.icon className="size-5 text-gold" />
                    <span>
                      <span className="block text-sm">{option.label}</span>
                      <span className="block text-xs text-foreground/40">{option.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-24">
            <h2 className="mb-4 text-sm uppercase tracking-widest text-gold">Resumo</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-3 text-xs">
                  <span className="min-w-0 text-foreground/70">
                    {item.quantity}× {item.name}
                    {Object.keys(item.variations).length > 0 ? (
                      <span className="block text-foreground/35">{Object.values(item.variations).join(" · ")}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0">{brl(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-foreground/60">
                <span>Subtotal</span>
                <span>{brl(subtotal)}</span>
              </div>
              <div className="flex justify-between text-foreground/60">
                <span>Frete</span>
                <span>{shipping ? (shipping.price === 0 ? "Grátis" : brl(shipping.price)) : "—"}</span>
              </div>
              <div className="flex justify-between pt-2 text-base font-bold">
                <span>Total</span>
                <span className="text-gold">{brl(total)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 bg-gold px-8 py-4 text-xs font-bold uppercase tracking-widest text-background disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitting ? "Processando" : "Finalizar pedido"}
            </button>
          </aside>
        </div>
      </form>
    </StoreLayout>
  );
}
