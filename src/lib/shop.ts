import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Banner = Database["public"]["Tables"]["banners"]["Row"];
export type StoreSettings = Database["public"]["Tables"]["store_settings"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];

export type ProductOption = { name: string; values: string[] };

export function productOptions(product: Pick<Product, "options">): ProductOption[] {
  const raw = product.options;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const obj = entry as Record<string, unknown>;
    const name = typeof obj["name"] === "string" ? obj["name"] : null;
    const values = Array.isArray(obj["values"])
      ? (obj["values"] as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
    return name && values.length ? [{ name, values }] : [];
  });
}

export function finalPrice(product: Pick<Product, "price" | "sale_price">): number {
  return product.sale_price != null && product.sale_price > 0
    ? Number(product.sale_price)
    : Number(product.price);
}

export function isAvailable(product: Pick<Product, "sold_out" | "stock" | "active">): boolean {
  return product.active && !product.sold_out && product.stock > 0;
}

export const storeKeys = {
  products: ["shop", "products"] as const,
  product: (slug: string) => ["shop", "product", slug] as const,
  categories: ["shop", "categories"] as const,
  banners: ["shop", "banners"] as const,
  settings: ["shop", "settings"] as const,
};

export const productsQuery = queryOptions({
  queryKey: storeKeys.products,
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const categoriesQuery = queryOptions({
  queryKey: storeKeys.categories,
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

export const bannersQuery = queryOptions({
  queryKey: storeKeys.banners,
  queryFn: async (): Promise<Banner[]> => {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

export const settingsQuery = queryOptions({
  queryKey: storeKeys.settings,
  queryFn: async (): Promise<StoreSettings | null> => {
    const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export function productQuery(slug: string) {
  return queryOptions({
    queryKey: storeKeys.product(slug),
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
