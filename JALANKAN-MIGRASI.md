# Jalankan Migrasi CMS + RBAC

Fitur baru (panel CMS super admin, persetujuan artikel, lampiran, pendaftaran
konselor) butuh **7 tabel baru + 4 kolom baru** di database. Selama migrasi ini
belum dijalankan, halaman `/admin/cms`, `/admin/articles`, dan `/admin/konselor`
akan tampil kosong (tidak error, tapi belum ada isinya).

## Langkah

1. Buka **https://supabase.com/dashboard** → pilih project
   `aslvltjvqnpedmnarkea` (UPK-Kr).

2. Di menu kiri, klik **SQL Editor** → **+ New query**.

3. Buka file berikut di komputer, **salin SELURUH isinya**:

   ```
   C:\Users\jerem\upk-analysis\upk-kr-konseling\supabase\cms-rbac.sql
   ```

   Cara cepat membukanya: tekan `Win + R`, tempel baris di atas, Enter.
   (Atau lewat Notepad: klik kanan file → Open with → Notepad.)

4. Tempel ke SQL Editor, lalu klik **Run** (atau `Ctrl + Enter`).

5. Di bagian paling bawah hasil, akan muncul tabel verifikasi:

   ```
   tabel              | baris
   -------------------+------
   site_settings      |     6
   hotline_contacts   |     3
   legal_documents    |     3
   konselor_profiles  |     0
   ```

   Angka `baris` yang bukan 0 menandakan seed berhasil.

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
