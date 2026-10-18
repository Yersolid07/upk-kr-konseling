# Email Auth — Konfigurasi Supabase

Dokumen ini menjelaskan **satu** langkah yang tidak bisa dikerjakan lewat kode:
konfigurasi Supabase Auth. Semua yang lain sudah otomatis.

## Akar masalah yang sudah diperbaiki di kode

| Masalah | Penyebab | Perbaikan |
|---|---|---|
| Tautan di email mendarat di `localhost:3000` | `site_url` Supabase masih `http://localhost:3000` dan Redirect URLs kosong, sehingga Supabase **mengabaikan** `redirect_to` dari aplikasi | Template memakai `token_hash` → `/auth/confirm` (diverifikasi aplikasi sendiri) |
| Daftar dengan email terdaftar tidak ditolak | Supabase membalas HTTP 200 dengan `identities: []` | `register()` memeriksa `identities.length === 0` |
| Setelah daftar langsung dilempar ke login | tidak ada halaman tunggu | `/auth/verify-status` + polling bertahap |
| `/tos` 404 | halaman sebenarnya `/terms` | `redirects()` di `next.config.mjs` |
| Setelah reset kata sandi mendarat di dashboard lalu ditendang | `redirect('/dashboard')` tanpa sesi pemulihan | `signOut()` → `/auth/login?reset=1` |

## Yang perlu dijalankan sekali

### 1. Pasang template + perbaiki URL (cara cepat)

```bash
# Buat token di https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_xxx python tools/install_email_templates.py --dry-run
SUPABASE_ACCESS_TOKEN=sbp_xxx python tools/install_email_templates.py
```

Skrip mengubah:
- **Site URL** → `https://upk-kr-konseling.vercel.app`
- **Redirect URLs** → domain produksi + `localhost:3000/3002`
- **4 template** → `confirm-signup`, `reset-password`, `change-email`, `magic-link`

### 2. Atau tempel manual di Dashboard

**Authentication → URL Configuration**
- Site URL: `https://upk-kr-konseling.vercel.app`
- Redirect URLs: tambahkan `https://upk-kr-konseling.vercel.app/**`, `http://localhost:3000/**`, `http://localhost:3002/**`

**Authentication → Email Templates** — salin seluruh isi berkas:

| Template | Berkas |
|---|---|
| Confirm signup | `supabase/email-templates/confirm-signup.html` |
| Reset password | `supabase/email-templates/reset-password.html` |
| Change email address | `supabase/email-templates/change-email.html` |
| Magic Link | `supabase/email-templates/magic-link.html` |

## Mengapa `token_hash` dan bukan `{{ .ConfirmationURL }}`

`{{ .ConfirmationURL }}` menghasilkan tautan ke:

```
https://<project>.supabase.co/auth/v1/verify?token=...&type=...&redirect_to=<site_url>
```

`redirect_to` **hanya dihormati bila cocok dengan daftar Redirect URLs**. Karena
daftar itu kosong, Supabase diam-diam menggantinya dengan `site_url` — dan
`site_url` adalah `localhost:3000`. Dibuktikan dengan memanggil
`/auth/v1/admin/generate_link` dengan `redirect_to=http://localhost:3002/...`:
tautan yang dihasilkan tetap `localhost:3000`.

Bentuk baru:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

`token_hash` diverifikasi oleh `src/app/auth/confirm/route.ts` memakai
`verifyOtp()`, lalu pengguna diarahkan ke path relatif terhadap permintaan yang
sedang berjalan. Hasilnya benar di localhost maupun produksi, tanpa bergantung
pada `site_url`.

`{{ .SiteURL }}` tetap dipakai sebagai basis — jadi **Site URL harus benar**
agar tautan menunjuk ke aplikasi, bukan ke Supabase. Itulah sebabnya langkah 1
tidak opsional.

## Batasan yang diketahui

- **Tautan `token_hash` hanya bisa dipakai sekali.** Sudah diuji: pemakaian
  kedua ditolak dan diarahkan ke `/auth/login`.
- **`next` hanya menerima path internal.** `//evil.example.com` ditolak dan
  jatuh ke tujuan bawaan. Sudah diuji.
- **Kotak masuk email tidak bisa dibaca dari sini.** Uji end-to-end memakai
  `admin/generate_link` untuk mendapatkan `hashed_token`, lalu mengikuti alur
  yang sama seperti pengguna.
- **Pengiriman email memakai SMTP bawaan Supabase**, yang dibatasi beberapa
  email per jam. Untuk pemakaian nyata, pasang SMTP sendiri di
  Authentication → Settings → SMTP (Resend sudah ada di `package.json`).
