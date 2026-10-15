# 🔐 Keamanan: Rotasi Kunci Supabase (WAJIB — lakukan sekarang)

> **Kenapa penting?** Kunci `SUPABASE_SERVICE_ROLE_KEY` asli pernah ter-commit ke
> repositori **publik** GitHub (`Yersolid07/upk-kr-konseling`) pada file `.env.local`
> dan `.env.example`. Kunci service_role **melewati seluruh RLS** — siapa pun yang
> pernah meng-clone/fork repo itu bisa membaca, mengubah, dan menghapus SELURUH
> database Anda. Kode sudah dibersihkan dari repo, tetapi **kunci lama tetap harus
> dianggap bocor** dan wajib dirotasi. Ini tidak bisa diotomatiskan dari sisi kode.

Lakukan langkah berikut di [supabase.com](https://supabase.com) (butuh login akun Anda):

## 1. Rotasi kunci API
1. Buka project → **Project Settings** → **API**.
2. Klik **Rotate** pada **anon / public** key → konfirmasi.
3. Klik **Rotate** pada **service_role** key → konfirmasi.
4. Buka **Project Settings** → **API** → **JWT Settings** → **Generate new JWT secret**.
   (Ini otomatis membuat kunci lama tidak valid.)
5. Salin nilai **baru** ke `.env.local` (lokal) **dan** ke Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` (tidak berubah)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key **baru**
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key **baru**

## 2. Rotasi kredensial lain yang pernah ada di repo
- **Fonnte** → ganti token di dashboard Fonnte (`FONNTE_TOKEN`).
- **Resend** → revoke & buat API key baru (`RESEND_API_KEY`).
- **Telegram Bot** → `/revoke` via BotFather, buat token baru (`TELEGRAM_BOT_TOKEN`).
- **VAPID** → generate ulang dengan `npx web-push generate-vapid-keys`.

## 3. Perbarui Vercel
1. Vercel → project → **Settings** → **Environment Variables**.
2. Update ketiga variabel Supabase dengan nilai baru (Production + Preview + Development).
3. **Redeploy** agar env baru terpakai.

## 4. Perbarui Supabase Redirect URLs
Auth → **URL Configuration** → **Site URL** dan **Redirect URLs**:
```
https://<domain-vercel-anda>.vercel.app
https://<domain-vercel-anda>.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

## 5. Audit akses tak dikenal
- Supabase → **Reports** / **Logs** → cek `Postgres Logs` & `API Logs` untuk
  aktivitas aneh (query massal, login dari IP asing) sebelum rotasi.
- Ganti password akun Supabase bila perlu, dan aktifkan 2FA.

## 6. Pastikan tidak terulang
- `.gitignore` sudah mengecualikan **semua** `.env*` kecuali `.env.example`.
- `.env.example` kini hanya berisi placeholder (`your-anon-key`, dst.).
- Jangan pernah menaruh kunci asli di `.env.example`, `vercel.json`, atau file kode.

> Setelah rotasi selesai, semua sesi lama tetap valid (JWT user ditandatangani ulang
> saat login berikutnya). Jika Anda memakai `NEXT_PUBLIC_*`, build ulang Vercel.
