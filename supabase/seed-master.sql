-- =====================================================
-- MASTER SEED: Mengisi Data Awal yang Kosong (Kategori, dll)
-- Silakan jalankan di Supabase Dashboard -> SQL Editor
-- =====================================================

-- 1. Mengisi tabel kategori diskusi (thread_categories)
INSERT INTO public.thread_categories (name, name_en, slug, icon, color, sort_order)
VALUES
    ('Iman & Rohani',   'Faith & Spirituality', 'iman',      '🙏', '#C9993A', 1),
    ('Kecemasan',       'Anxiety',              'kecemasan', '🌊', '#C4895A', 2),
    ('Keluarga',        'Family',               'keluarga',  '👨‍👩‍👧‍👦', '#6B8C72', 3),
    ('Akademik',        'Academic',             'akademik',  '📚', '#7C5C3E', 4),
    ('Karir',           'Career',               'karir',     '💼', '#8A6090', 5),
    ('Hubungan',        'Relationships',        'hubungan',  '🤝', '#A07850', 6),
    ('Motivasi',        'Motivation',           'motivasi',  '🔥', '#4A8C7C', 7),
    ('Umum',            'General',              'umum',      '💬', '#888888', 8)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color;

-- 2. Memastikan tidak ada RLS yang menghalangi pembacaan kategori publik
ALTER TABLE public.thread_categories DISABLE ROW LEVEL SECURITY;

-- 3. (Opsional) Menambahkan kategori artikel jika diperlukan nanti
-- Jika tabel article_categories ada, bisa ditambahkan di sini.
