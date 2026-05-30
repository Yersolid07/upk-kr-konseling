-- Tambahkan kolom untuk menyimpan jadwal konselor (JSON)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS counselor_schedule JSONB DEFAULT '{"Senin": [], "Selasa": [], "Rabu": [], "Kamis": [], "Jumat": [], "Sabtu": [], "Minggu": []}'::jsonb;

-- Flag untuk mengecek apakah konselor sudah melengkapi datanya
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_counselor_setup_completed BOOLEAN DEFAULT false;

-- Tambahkan kolom sertifikat jika belum ada (opsional)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS counselor_certificate TEXT;
