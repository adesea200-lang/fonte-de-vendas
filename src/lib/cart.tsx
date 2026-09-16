import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  stock: number;
  weightGrams: number;
  variations: Record<string, string>;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  weightGrams: number;
  addItem: (item: Omit<CartItem, "key">) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  ready: boolean;
};

const STORAGE_KEY = "fdp.cart.v1";
const CartContext = createContext<CartContextValue | null>(null);

function itemKey(productId: string, variations: Record<string, string>) {
  const suffix = Object.entries(variations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return suffix ? `${productId}__${suffix}` : productId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* carrinho corrompido: começa vazio */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const weightGrams = items.reduce((acc, item) => acc + item.weightGrams * item.quantity, 0);
    return {
      items,
      ready,
      subtotal,
      weightGrams,
      count: items.reduce((acc, item) => acc + item.quantity, 0),
      addItem: (item) =>
        setItems((current) => {
          const key = itemKey(item.productId, item.variations);
          const existing = current.find((i) => i.key === key);
          if (existing) {
            return current.map((i) =>
              i.key === key
                ? { ...i, quantity: Math.min(i.stock, i.quantity + item.quantity) }
                : i,
            );
          }
          return [...current, { ...item, key }];
        }),
      removeItem: (key) => setItems((current) => current.filter((i) => i.key !== key)),
      setQuantity: (key, quantity) =>
        setItems((current) =>
          current.map((i) =>
            i.key === key ? { ...i, quantity: Math.max(1, Math.min(i.stock, quantity)) } : i,
          ),
        ),
      clear: () => setItems([]),
    };
  }, [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}
