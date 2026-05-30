-- =====================================================
-- FIX: Tambah Kolom Konselor ke tabel profiles
-- Silakan jalankan di Supabase Dashboard -> SQL Editor
-- =====================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS counselor_schedule JSONB,
ADD COLUMN IF NOT EXISTS counselor_certificate TEXT,
ADD COLUMN IF NOT EXISTS is_counselor_setup_completed BOOLEAN NOT NULL DEFAULT FALSE;
