-- ROLES
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2) check (sale_price >= 0),
  category_id uuid references public.categories(id) on delete set null,
  subcategory text,
  image_url text,
  gallery text[] not null default '{}',
  stock int not null default 0,
  active boolean not null default true,
  featured boolean not null default false,
  sold_out boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  weight_grams int not null default 400,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (active = true or public.has_role(auth.uid(),'admin'));
create policy "products admin write" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create index products_category_idx on public.products(category_id);

-- BANNERS
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  image_url text,
  button_label text,
  button_link text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.banners to anon;
grant select, insert, update, delete on public.banners to authenticated;
grant all on public.banners to service_role;
alter table public.banners enable row level security;
create policy "banners public read" on public.banners for select to anon, authenticated using (true);
create policy "banners admin write" on public.banners for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger banners_touch before update on public.banners for each row execute function public.touch_updated_at();

-- STORE SETTINGS
create table public.store_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Fonte das Peitas',
  logo_url text,
  whatsapp text,
  email text,
  instagram text,
  tiktok text,
  facebook text,
  address text,
  contact_info text,
  announcement text,
  free_shipping_threshold numeric(10,2) not null default 399,
  updated_at timestamptz not null default now()
);
grant select on public.store_settings to anon;
grant select, insert, update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "settings public read" on public.store_settings for select to anon, authenticated using (true);
create policy "settings admin write" on public.store_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  cpf text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "customers admin read" on public.customers for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ORDERS
create type public.payment_status as enum ('pendente','aprovado','recusado');
create type public.order_status as enum ('novo','preparando','enviado','entregue','cancelado');
create type public.payment_method as enum ('pix','cartao');

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('FP-' || nextval('public.order_number_seq')::text),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text not null,
  zip text not null,
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state text not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  shipping_label text,
  total numeric(10,2) not null,
  payment_method payment_method not null default 'pix',
  payment_status payment_status not null default 'pendente',
  status order_status not null default 'novo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders admin read" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "orders admin update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  image_url text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  variations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "order items admin read" on public.order_items for select to authenticated using (public.has_role(auth.uid(),'admin'));
create index order_items_order_idx on public.order_items(order_id);

-- SEED
insert into public.store_settings (id, whatsapp, email, instagram, address, contact_info, announcement)
values (1, '11999999999', 'contato@fontedaspeitas.com.br', '@fontedaspeitas', 'São Paulo, SP', 'Atendimento de segunda a sexta, 9h às 18h', 'FRETE GRÁTIS ACIMA DE R$ 399');

insert into public.categories (name, slug, description, sort_order) values
  ('Camisetas','camisetas','Peitas oversized e regulares',1),
  ('Moletons','moletons','Moletons e corta-ventos',2),
  ('Acessórios','acessorios','Bonés, correntes e mais',3);

insert into public.banners (title, subtitle, description, button_label, button_link, sort_order) values
  ('A Braba do Asfalto','Lançamento 2026','Estilo urbano raiz com acabamento premium. A fonte das peitas exclusivas chegou.','Comprar agora','/produtos',1);

insert into public.products (name, slug, description, price, sale_price, category_id, subcategory, stock, featured, options)
select 'Peita Over "Realeza"','peita-over-realeza','Camiseta oversized em algodão premium 100% penteado, com estampa em silk de alta densidade e detalhes dourados.',229.00,189.90,c.id,'Oversized',18,true,
  '[{"name":"Tamanho","values":["P","M","G","GG"]},{"name":"Cor","values":["Preto","Off White"]}]'::jsonb
from public.categories c where c.slug='camisetas';

insert into public.products (name, slug, description, price, category_id, subcategory, stock, featured, sold_out, options)
select 'Peita Fonte Gold','peita-fonte-gold','Camiseta com lettering dourado assinatura da marca. Modelagem regular e caimento reto.',159.90,c.id,'Regular',0,true,true,
  '[{"name":"Tamanho","values":["P","M","G","GG"]}]'::jsonb
from public.categories c where c.slug='camisetas';

insert into public.products (name, slug, description, price, category_id, subcategory, stock, featured, options, weight_grams)
select 'Moletom Coroa Signature','moletom-coroa-signature','Moletom flanelado com bordado da coroa em fio dourado. Punhos canelados e capuz duplo.',349.90,c.id,'Moletom',12,true,
  '[{"name":"Tamanho","values":["P","M","G","GG"]},{"name":"Cor","values":["Preto","Grafite"]}]'::jsonb, 900
from public.categories c where c.slug='moletons';

insert into public.products (name, slug, description, price, sale_price, category_id, subcategory, stock, options, weight_grams)
select 'Boné Coroa Gold Edition','bone-coroa-gold-edition','Boné snapback preto com bordado da coroa em dourado. Aba reta e ajuste traseiro.',149.90,129.90,c.id,'Boné',25,
  '[{"name":"Tamanho","values":["Único"]}]'::jsonb, 250
from public.categories c where c.slug='acessorios';