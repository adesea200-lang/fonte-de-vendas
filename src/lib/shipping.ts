import { onlyDigits } from "./format";

export type ShippingOption = {
  id: "pac" | "sedex";
  label: string;
  price: number;
  days: string;
};

type Region = { name: string; base: number; extraPerKg: number; days: [number, number] };

// Faixas de CEP por região (primeiro dígito do CEP).
const REGIONS: Record<string, Region> = {
  "0": { name: "SP capital", base: 18.9, extraPerKg: 4, days: [1, 3] },
  "1": { name: "SP interior", base: 21.9, extraPerKg: 4.5, days: [2, 5] },
  "2": { name: "RJ / ES", base: 26.9, extraPerKg: 5, days: [3, 6] },
  "3": { name: "MG", base: 27.9, extraPerKg: 5, days: [3, 7] },
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

/**
 * Calcula as opções de frete a partir do CEP, do peso total e do subtotal.
 * Acima do valor configurado na loja, o PAC fica grátis.
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
  const kg = Math.max(0.5, weightGrams / 1000);
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
