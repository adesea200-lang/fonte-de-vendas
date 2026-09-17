import { onlyDigits } from "./format";

export type ShippingOption = {
  id: "pac" | "sedex";
  label: string;
  price: number;
  days: string;
};

type Region = { name: string; base: number; extraPerKg: number; days: [number, number] };

/** Caixa padrão da loja (cm) e peso médio de uma camisa embalada (g). */
export const BOX = { length: 35, width: 25, height: 10 } as const;
export const DEFAULT_ITEM_WEIGHT_GRAMS = 500;
/** Peso máximo real acomodado em uma caixa antes de despachar outra. */
const BOX_CAPACITY_GRAMS = 4000;
/** Divisor dos Correios para peso cubado (cm³ / 6000 = kg). */
const CUBIC_DIVISOR = 6000;

/** Origem dos envios: Cruzeiro - SP (CEP 12700-000). */
export const ORIGIN = { city: "Cruzeiro", state: "SP", zip: "12700000" } as const;

// Faixas de CEP por região (primeiro dígito do CEP), partindo de Cruzeiro/SP.
const REGIONS: Record<string, Region> = {
  "0": { name: "SP capital", base: 19.9, extraPerKg: 4, days: [1, 3] },
  "1": { name: "SP interior / Vale do Paraíba", base: 17.9, extraPerKg: 3.5, days: [1, 3] },
  "2": { name: "RJ / ES", base: 24.9, extraPerKg: 5, days: [2, 5] },
  "3": { name: "MG", base: 26.9, extraPerKg: 5, days: [3, 6] },
  "4": { name: "BA / SE", base: 34.9, extraPerKg: 6.5, days: [5, 10] },
  "5": { name: "PE / AL / PB / RN", base: 36.9, extraPerKg: 7, days: [6, 12] },
  "6": { name: "CE / PI / MA / Norte", base: 39.9, extraPerKg: 8, days: [7, 14] },
  "7": { name: "DF / GO / MT / MS", base: 31.9, extraPerKg: 6, days: [4, 9] },
  "8": { name: "PR / SC", base: 27.9, extraPerKg: 5, days: [3, 7] },
  "9": { name: "RS", base: 29.9, extraPerKg: 5.5, days: [4, 8] },
};

export function isValidCep(cep: string): boolean {
  return onlyDigits(cep).length === 8;
}

/** Quantidade de caixas necessária para o peso real informado. */
export function boxesFor(weightGrams: number): number {
  return Math.max(1, Math.ceil(Math.max(weightGrams, DEFAULT_ITEM_WEIGHT_GRAMS) / BOX_CAPACITY_GRAMS));
}

/** Peso cubado de uma caixa padrão, em kg. */
export function cubicWeightKg(): number {
  return (BOX.length * BOX.width * BOX.height) / CUBIC_DIVISOR;
}

/**
 * Peso taxado pelos Correios: o maior entre o peso real e o peso cubado
 * da(s) caixa(s) 35x25x10 usada(s) no envio.
 */
export function chargeableWeightKg(weightGrams: number): number {
  const boxes = boxesFor(weightGrams);
  const realKg = Math.max(weightGrams, DEFAULT_ITEM_WEIGHT_GRAMS) / 1000;
  const cubicKg = cubicWeightKg() * boxes;
  return Math.max(0.5, Math.max(realKg, cubicKg));
}

/**
 * Calcula as opções de frete a partir do CEP de destino, do peso real dos
 * itens e do subtotal. Acima do valor configurado na loja, o PAC fica grátis.
 */
export function calcularFrete(
  cep: string,
  weightGrams: number,
  subtotal: number,
  freeShippingThreshold = 399,
): ShippingOption[] {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return [];
  const region = REGIONS[digits[0] as keyof typeof REGIONS] ?? REGIONS["1"]!;
  const kg = chargeableWeightKg(weightGrams);
  const extra = Math.max(0, kg - 0.5) * region.extraPerKg;

  const pacPrice =
    freeShippingThreshold > 0 && subtotal >= freeShippingThreshold
      ? 0
      : round(region.base + extra);
  const sedexPrice = round(region.base * 1.75 + extra * 1.4);

  return [
    {
      id: "pac",
      label: `Entrega padrão · ${region.days[0]} a ${region.days[1]} dias úteis`,
      price: pacPrice,
      days: `${region.days[0]}-${region.days[1]} dias úteis`,
    },
    {
      id: "sedex",
      label: `Entrega expressa · ${Math.max(1, region.days[0] - 1)} a ${Math.max(2, region.days[1] - 3)} dias úteis`,
      price: sedexPrice,
      days: `${Math.max(1, region.days[0] - 1)}-${Math.max(2, region.days[1] - 3)} dias úteis`,
    },
  ];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export type ViaCepAddress = {
  street: string;
  district: string;
  city: string;
  state: string;
};

export async function buscarEnderecoPorCep(cep: string): Promise<ViaCepAddress | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      street: data.logradouro ?? "",
      district: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
