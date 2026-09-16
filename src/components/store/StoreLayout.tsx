import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, Menu, X, Instagram, MessageCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import logo from "@/assets/logo.png.asset.json";
import { useCart } from "@/lib/cart";
import { categoriesQuery, settingsQuery } from "@/lib/shop";
import { cn } from "@/lib/utils";

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-gold text-[10px] font-bold text-background">
      {count}
    </span>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { count, ready } = useCart();
  const { data: categories } = useQuery(categoriesQuery);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={logo.url} alt="Fonte das Peitas" className="h-9 w-auto shrink-0" />
          </Link>

          <nav className="hidden min-w-0 items-center justify-center gap-6 md:flex">
            <Link to="/produtos" className="text-xs font-bold uppercase tracking-widest text-foreground/70 hover:text-gold">
              Produtos
            </Link>
            {(categories ?? []).slice(0, 3).map((category) => (
              <Link
                key={category.id}
                to="/categoria/$slug"
                params={{ slug: category.slug }}
                className="text-xs font-bold uppercase tracking-widest text-foreground/70 hover:text-gold"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <Link to="/busca" aria-label="Buscar produtos" className="text-foreground/70 hover:text-gold">
              <Search className="size-5" />
            </Link>
            <Link to="/carrinho" aria-label="Carrinho" className="relative text-foreground/70 hover:text-gold">
              <ShoppingBag className="size-5" />
              <CartBadge count={ready ? count : 0} />
            </Link>
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setOpen((v) => !v)}
              className="text-foreground md:hidden"
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {open ? (
          <div className="border-t border-border bg-background px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              <Link
                to="/produtos"
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-bold uppercase tracking-widest"
              >
                Todos os produtos
              </Link>
              {(categories ?? []).map((category) => (
                <Link
                  key={category.id}
                  to="/categoria/$slug"
                  params={{ slug: category.slug }}
                  onClick={() => setOpen(false)}
                  className="py-2 text-sm font-bold uppercase tracking-widest text-foreground/70"
                >
                  {category.name}
                </Link>
              ))}
              <Link
                to="/admin/login"
                onClick={() => setOpen(false)}
                className="py-2 text-xs uppercase tracking-widest text-muted-foreground"
              >
                Acesso administrativo
              </Link>
            </nav>
          </div>
        ) : null}
      </header>
      <div className="h-16" />
    </>
  );
}

function Footer() {
  const { data: settings } = useQuery(settingsQuery);
  const whatsapp = settings?.whatsapp?.replace(/\D/g, "");

  return (
    <footer className="mt-20 border-t border-border bg-surface px-6 pb-32 pt-12 md:pb-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <img src={logo.url} alt="Fonte das Peitas" className="mb-4 h-12 w-auto" />
            <p className="text-xs leading-relaxed text-foreground/40">
              {settings?.address ?? "São Paulo, SP"}
              <br />
              {settings?.email ?? "contato@fontedaspeitas.com.br"}
              <br />
              {settings?.contact_info}
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-xs tracking-[0.2em] text-gold">Loja</h3>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li>
                <Link to="/produtos" className="hover:text-gold">
                  Produtos
                </Link>
              </li>
              <li>
                <Link to="/busca" className="hover:text-gold">
                  Buscar
                </Link>
              </li>
              <li>
                <Link to="/carrinho" className="hover:text-gold">
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-xs tracking-[0.2em] text-gold">Atendimento</h3>
            <div className="flex gap-4">
              {whatsapp ? (
                <a
                  href={`https://wa.me/55${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="grid size-10 place-items-center rounded-full border border-border text-foreground/60 transition-colors hover:border-gold hover:text-gold"
                >
                  <MessageCircle className="size-4" />
                </a>
              ) : null}
              {settings?.instagram ? (
                <a
                  href={`https://instagram.com/${settings.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="grid size-10 place-items-center rounded-full border border-border text-foreground/60 transition-colors hover:border-gold hover:text-gold"
                >
                  <Instagram className="size-4" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-6 text-[10px] uppercase tracking-widest text-foreground/25">
          <span>© {new Date().getFullYear()} {settings?.store_name ?? "Fonte das Peitas"}</span>
          <Link to="/admin/login" className="w-fit hover:text-gold">
            Acesso administrativo
          </Link>
        </div>
      </div>
    </footer>
  );
}

function MobileBar() {
  const { count, ready } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/", label: "Loja", icon: Home },
    { to: "/busca", label: "Busca", icon: Search },
    { to: "/carrinho", label: "Carrinho", icon: ShoppingBag },
  ] as const;

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 flex h-16 w-[90%] max-w-sm -translate-x-1/2 items-center justify-around rounded-full border border-border bg-background/90 px-6 shadow-2xl backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "relative flex flex-col items-center gap-1 text-[10px] uppercase tracking-widest transition-colors",
              active ? "text-gold" : "text-foreground/40",
            )}
          >
            <Icon className="size-5" />
            {item.label}
            {item.to === "/carrinho" ? <CartBadge count={ready ? count : 0} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>{children}</main>
      <Footer />
      <MobileBar />
    </div>
  );
}
