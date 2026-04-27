-- 1. Add total_price to reservations (FCFA)
ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS total_price numeric NOT NULL DEFAULT 0;

-- 2. Add new whatsapp_status enum values for manual_wa_me workflow
ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'opened_wa';
ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'manual_sent_pending_confirmation';
ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'sent_manually';
ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'failed_manual';

-- 3. Helper view: aggregated payments per reservation
CREATE OR REPLACE VIEW public.reservation_payment_summary AS
SELECT 
  r.id AS reservation_id,
  r.total_price,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) AS paid_amount,
  GREATEST(r.total_price - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0), 0) AS remaining_amount,
  CASE 
    WHEN r.total_price <= 0 THEN 'unset'
    WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) <= 0 THEN 'unpaid'
    WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) >= r.total_price THEN 'settled'
    ELSE 'advance'
  END AS payment_status_label
FROM public.reservations r
LEFT JOIN public.payments p ON p.reservation_id = r.id
GROUP BY r.id, r.total_price;

GRANT SELECT ON public.reservation_payment_summary TO authenticated, anon;