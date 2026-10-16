# Jalankan Migrasi Database

Perubahan keamanan dan CMS membutuhkan **3 berkas SQL** yang dijalankan secara
berurutan di Supabase SQL Editor. Semua berkas idempotent (aman dijalankan
berulang kali tanpa merusak data).

## Urutan Eksekusi (WAJIB BERURUTAN)

1. **`supabase/cms-rbac.sql`** (tabel CMS, seed pengaturan, peran konselor)
2. **`supabase/hotfix-security.sql`** (Fase 0: hotfix eskalasi peran, trigger profil aman, RPC notifikasi)
3. **`supabase/phase1-data-security.sql`** (Fase 1: anon_token privat, view publik, privasi chat, perlindungan kolom)

## Cara Menjalankan

1. Buka **https://supabase.com/dashboard** → pilih project
   `aslvltjvqnpedmnarkea` (IKA UPK-Kr FT UNSRAT).

2. Di menu kiri, klik **SQL Editor** → **+ New query**.

3. Buka berkas SQL yang bersangkutan di komputer:
   - Tekan `Win + R`
   - Tempel path lengkap (misalnya `C:\Users\jerem\upk-analysis\upk-kr-konseling\supabase\hotfix-security.sql`)
   - Buka dengan Notepad, salin seluruh isinya (`Ctrl + A`, `Ctrl + C`)

4. Tempel ke SQL Editor Supabase, lalu klik tombol **Run** (atau `Ctrl + Enter`).

5. Ulangi untuk berkas berikutnya. Di bagian bawah setiap berkas ada query
   verifikasi yang memastikan migrasi sukses terpasang.

## Aman dijalankan berulang

File ini idempotent — boleh dijalankan berkali-kali tanpa error:

| Objek | Pengaman |
|---|---|
| 5 tipe enum | blok `DO $$ ... EXCEPTION WHEN duplicate_object` |
| 7 tabel | `CREATE TABLE IF NOT EXISTS` |
| 4 kolom baru di `articles` | `ADD COLUMN IF NOT EXISTS` |
| 10 fungsi | `CREATE OR REPLACE FUNCTION` |
| 3 trigger | `DROP TRIGGER IF EXISTS` sebelum `CREATE TRIGGER` |
| 19 policy | `DROP POLICY IF EXISTS` sebelum `CREATE POLICY` |
| 4 seed | `ON CONFLICT ... DO NOTHING` |

## Kalau muncul error

Kirimkan saja teks error-nya. Yang umum:

- **`must be owner of table objects`** — policy pada `storage.objects`
  ditolak. Jalankan bagian itu saja lewat menu **Storage → Policies → New
  policy** di dashboard, atau abaikan dulu: lampiran tetap bisa diunggah,
  hanya pembatasan folder per-pengguna yang tidak aktif.
- **`relation "profiles" does not exist`** — migrasi dasar belum jalan.
  Jalankan `supabase/schema.sql` lalu `supabase/rls.sql` lebih dulu.

## Setelah migrasi

Buka lagi:

- `/admin/cms` — atur nama situs, nomor hotline, dokumen legal
- `/admin/articles` — antrean persetujuan artikel
- `/admin/konselor` — antrean pengajuan calon konselor
- `/legal/terms` — S&K (isinya sekarang diambil dari database)

Panel `/admin/cms` hanya bisa dibuka **super_admin**. Kalau akunmu masih
`member`, jalankan SQL ini di SQL Editor (ganti bagian email):

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'email-kamu@gmail.com');

-- Cek hasilnya:
SELECT p.full_name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.role;
```
