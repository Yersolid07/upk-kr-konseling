-- =====================================================
-- REFRESH prayers_public VIEW — tambah comment_count
-- Jalankan di Supabase SQL Editor (sekali saja)
-- =====================================================

-- Hapus view lama (kalau ada)
DROP VIEW IF EXISTS public.prayers_public CASCADE;

-- Buat ulang view dengan logika yang sama + kolom comment_count
CREATE VIEW public.prayers_public
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.content,
  r.category_id,
  r.is_anonymous,
  r.is_answered,
  r.pray_count,
  r.comment_count,
  r.created_at,
  r.updated_at,
  CASE WHEN r.is_anonymous THEN NULL ELSE r.author_id END AS author_id,
  CASE WHEN r.is_anonymous THEN public.public_anon_label('prayer', r.id) END AS anon_label,
  CASE WHEN r.is_anonymous THEN NULL ELSE p.full_name END AS author_name,
  CASE WHEN r.is_anonymous THEN NULL ELSE p.avatar_url END AS author_avatar
FROM public.prayer_requests r
LEFT JOIN public.profiles p ON p.id = r.author_id;

-- Catatan migrasi
INSERT INTO public.schema_migrations (version, description)
VALUES ('2026-11-12-refresh-prayers-view', 'prayers_public: tambah comment_count kolom')
ON CONFLICT (version) DO NOTHING;
