-- =====================================================
-- MASTER SEED: Mengisi Data Awal yang Kosong (Kategori, dll)
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- Idempotent: aman dijalankan berulang.
-- =====================================================

-- 1. Kategori diskusi (thread_categories)
--    Kolom `icon` menyimpan KEY ikon (bukan emoji); aplikasi memetakannya ke
--    ikon lucide lewat <CategoryIcon /> — lihat src/components/ui/icons.tsx.
INSERT INTO public.thread_categories (name, name_en, slug, icon, color, sort_order)
VALUES
    ('Iman & Rohani',   'Faith & Spirituality', 'iman',      'book',       '#C9993A', 1),
    ('Kecemasan',       'Anxiety',              'kecemasan', 'waves',      '#C4895A', 2),
    ('Keluarga',        'Family',               'keluarga',  'home',       '#6B8C72', 3),
    ('Akademik',        'Academic',             'akademik',  'graduation', '#7C5C3E', 4),
    ('Karir',           'Career',               'karir',     'briefcase',  '#8A6090', 5),
    ('Hubungan',        'Relationships',        'hubungan',  'heart',      '#A07850', 6),
    ('Motivasi',        'Motivation',           'motivasi',  'flame',      '#4A8C7C', 7),
    ('Umum',            'General',              'umum',      'chat',       '#888888', 8)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color;

-- 2. RLS untuk kategori: aktifkan kembali + izinkan baca publik (authenticated),
--    tetapi hanya admin ke atas yang boleh mengubah data kategori.
--    (Sebelumnya: DISABLE ROW LEVEL SECURITY — celah keamanan.)
ALTER TABLE public.thread_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON thread_categories;
CREATE POLICY "categories_select" ON thread_categories FOR SELECT
  TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "categories_write" ON thread_categories;
CREATE POLICY "categories_write" ON thread_categories FOR ALL
  TO authenticated USING (is_admin_or_above()) WITH CHECK (is_admin_or_above());

-- 3. (Opsional) Menambahkan kategori artikel jika diperlukan nanti
-- Jika tabel article_categories ada, bisa ditambahkan di sini.

