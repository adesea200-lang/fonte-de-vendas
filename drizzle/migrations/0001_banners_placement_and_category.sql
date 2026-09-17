ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'hero',
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_url text,
  ADD COLUMN IF NOT EXISTS pix_qr_code text,
  ADD COLUMN IF NOT EXISTS pix_qr_base64 text;

CREATE INDEX IF NOT EXISTS orders_payment_reference_idx ON public.orders (payment_reference);
CREATE INDEX IF NOT EXISTS banners_placement_idx ON public.banners (placement, sort_order);