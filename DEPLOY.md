# 🚀 DEPLOY — IKA UPK-Kr FT UNSRAT (Vercel + Supabase)

Repositori ini sudah terhubung ke Vercel (deploy otomatis dari branch `main`).
Dokumen ini merangkum **semua langkah** agar aplikasi jalan penuh di produksi.

---

## 0. Ringkasan sekali jalan

```bash
# 1. Lokal: pasang & verifikasi
npm install
npm run type-check
npm run build

# 2. Terapkan SQL baru ke Supabase (SQL Editor), lihat bagian 1
# 3. Rotasi kunci yang bocor (WAJIB) -> lihat SECURITY-ROTATE-KEYS.md
# 4. Set environment variables di Vercel -> lihat bagian 2
# 5. Push -> Vercel deploy otomatis
git push origin main
```

---

## 1. SQL yang harus dijalankan di Supabase (SQL Editor)

Jalankan **berurutan** pada project Supabase yang dipakai `.env.local`.
Semua file bersifat *idempotent* (aman diulang) kecuali `schema.sql` yang hanya
untuk database baru.

### Database BARU (pertama kali)
```
1. supabase/schema.sql                 ← tabel, trigger, fungsi dasar
2. supabase/rls.sql                    ← Row Level Security (sudah diperbaiki)
3. supabase/realtime.sql               ← aktifkan realtime pada tabel
4. supabase/seed-master.sql            ← kategori forum (RLS sudah benar)
```

### Database yang SUDAH ADA (update / migrasi)
```
1. supabase/rls.sql                    ← jalankan ulang: RLS diperketat
2. supabase/seed-master.sql            ← jalankan ulang: fix RLS kategori
3. supabase/fix-booking-integrity.sql  ← anti double-booking + notif booking
4. supabase/fix-chat-last-message.sql  ← kolom last_message + notif pesan
```

> File `fix-*.sql` lain (profiles-rls, register-trigger, dll.) hanya bila Anda
> memakai database lama yang belum pernah menerapkannya.

### Verifikasi cepat
```sql
-- Harus mengembalikan baris (bukan error) setelah fix-chat-last-message.sql
SELECT id, last_message FROM public.chat_sessions LIMIT 1;

-- Harus ada index uniq_active_booking_per_slot
SELECT indexname FROM pg_indexes WHERE tablename = 'bookings';

-- RLS aktif pada thread_categories
SELECT relrowsecurity FROM pg_class WHERE relname = 'thread_categories';  -- true
```

---

## 2. Environment Variables di Vercel

Vercel → project → **Settings → Environment Variables** (set untuk Production,
Preview, dan Development):

| Variabel | Wajib | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **server-only**, jangan pernah di client |
| ~~`NEXT_PUBLIC_APP_URL`~~ | — | **Tidak perlu lagi.** Alamat publik diturunkan dari header permintaan (`x-forwarded-host`). Setel `APP_URL` hanya bila ingin memaksa domain kanonik. |
| `NEXT_PUBLIC_APP_NAME` | ⬜ | `IKA UPK-Kr FT UNSRAT` |
| `FONNTE_TOKEN` | ⬜ | WhatsApp SOS |
| `NEXT_PUBLIC_SOS_WA_NUMBER` | ⬜ | nomor WA konselor piket |
| `NEXT_PUBLIC_SOS_HOTLINE` | ⬜ | default `119` |
| `RESEND_API_KEY` | ⬜ | email transaksional |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | ⬜ | web push |

Nilai lengkap & komentar ada di `.env.example`.

---

## 3. Konfigurasi Supabase Auth

- **Authentication → URL Configuration**
  - Site URL: `https://<domain>.vercel.app`
  - Redirect URLs: `https://<domain>.vercel.app/auth/callback` dan
    `http://localhost:3000/auth/callback`
- **Authentication → Email**: aktifkan konfirmasi email (opsional) dan
  sesuaikan template Bahasa Indonesia.
- **Database → Replication**: pastikan tabel berikut aktif untuk realtime
  (dijalankan oleh `realtime.sql`):
  `messages`, `chat_sessions`, `notifications`, `cell_group_messages`,
  `prayer_supports`, `threads`, `comments`, `profiles`.

---

## 4. Buat Super Admin pertama

Setelah ada 1 akun terdaftar (lewat /auth/register):

```sql
UPDATE profiles
SET role = 'super_admin', is_verified = true
WHERE id = '<USER_ID_DARI_AUTH>';
```

Lalu di **/admin** → assign role **konselor** ke pengguna yang berhak.

---

## 5. Deploy

**Otomatis (disarankan):** setiap `git push origin main` memicu build Vercel.

**Manual via CLI** (butuh login akun Vercel Anda — tidak dilakukan otomatis):
```bash
npx vercel login      # login interaktif di browser
npx vercel --prod     # deploy produksi
```

---

## 6. Checklist pasca-deploy

- [ ] `https://<domain>/` memuat landing page
- [ ] Register → email konfirmasi → login berhasil
- [ ] Dashboard menampilkan ayat harian & statistik
- [ ] Forum: buat thread, komentar, like
- [ ] Chat: kirim pesan, preview `last_message` muncul di daftar
- [ ] Booking: slot terisi tampil terkunci, tidak bisa dobel-booking
- [ ] Cell Group: buat grup (konselor), gabung, kirim pesan realtime
- [ ] SOS: notifikasi masuk ke konselor + sesi chat dibuat
- [ ] PWA: banner "Pasang aplikasi" muncul; halaman `/offline` saat jaringan mati
- [ ] Notifikasi realtime muncul di Topbar

---

## 7. Catatan versi

- Next.js dipatok ke **14.2.35** (patch keamanan terakhir seri 14.2).
  Sisa advisory `npm audit` pada Next 14 hanya bisa ditutup dengan upgrade
  **major ke Next 15/16** (breaking) — jadwalkan sebagai pekerjaan terpisah.
- `socket.io-client` & `react-intersection-observer` telah dihapus (tidak dipakai).

*Kiranya platform ini menjadi berkat. 🙏*
