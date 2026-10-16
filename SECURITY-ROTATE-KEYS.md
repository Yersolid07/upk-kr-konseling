# 🔴 Keamanan: Rotasi Kunci Supabase (WAJIB — lakukan SEKARANG)

> **Status: TERVERIFIKASI BOCOR DAN MASIH AKTIF.**
> Kunci `SUPABASE_SERVICE_ROLE_KEY` asli ter-commit ke repositori **publik**
> GitHub (`Yersolid07/upk-kr-konseling`) pada commit `15c588b`, berkas
> `.env.local`. Saya sudah mengujinya langsung ke Supabase: kunci itu
> **diterima (HTTP 200) saat ini juga**, dan nilainya **identik** dengan kunci
> yang dipakai aplikasi sekarang. Artinya belum pernah dirotasi.
>
> Kunci `service_role` **melewati seluruh RLS**. Siapa pun yang membuka repo
> itu bisa membaca SELURUH database — termasuk pesan konseling privat, catatan
> konselor, `anon_token` semua orang (yang memetakan "Anonim#A3F9" ke nama
> asli), dan data pribadi alumni — serta mengubah, menghapus, atau menaikkan
> peran akun mana pun menjadi `super_admin`.
>
> Hapus berkas dari commit terbaru **tidak cukup** — riwayat git menyimpan
> versi lama selamanya. **Hanya rotasi kunci yang menutup celah ini.**
> Langkah ini tidak bisa saya kerjakan untukmu: butuh login akun Supabase-mu.

---

## 0. Pilihan tercepat (lakukan dalam 2 menit)

Jadikan repo **private**: GitHub → repo → **Settings** → **General** →
paling bawah **Danger Zone** → **Change repository visibility** → **Private**.

Itu langsung menutup akses publik. Tapi **tetap lanjutkan rotasi** di bawah —
repo bisa saja sudah pernah di-clone, di-fork, atau di-cache pihak lain
(mesin pencari, arsip GitHub, bot pemindai rahasia).

---

## 1. Rotasi kunci Supabase

Buka **Project Settings** → **API** pada
https://supabase.com/dashboard/project/aslvltjvqnpedmnarkea/settings/api

1. **anon / public** → klik **Rotate** → konfirmasi.
2. **service_role** → klik **Rotate** → konfirmasi.
3. **JWT Settings** → **Generate new JWT secret**.
   Ini membatalkan SEMUA token lama, termasuk sesi login yang sedang berjalan.
   Itu memang yang kita mau — sesi lama tidak boleh dipercaya lagi.

## 2. Pasang kunci baru

**Lokal** — `C:\Users\jerem\upk-analysis\upk-kr-konseling\.env.local`:

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon baru>
SUPABASE_SERVICE_ROLE_KEY=<service_role baru>
```

**Vercel** — project `upk-kr-konseling` → **Settings** → **Environment
Variables** → ubah dua nilai yang sama (Production + Preview + Development)
→ **Redeploy**.

## 3. Rotasi kredensial lain yang pernah ada di repo

| Layanan | Cara mencabut |
|---|---|
| GitHub PAT | https://github.com/settings/tokens → **Revoke** |
| Fonnte | dashboard Fonnte → device → regenerate token (`FONNTE_TOKEN`) |
| Resend | https://resend.com/api-keys → delete → buat baru (`RESEND_API_KEY`) |
| VAPID | `npx web-push generate-vapid-keys` → ganti di env |
| Bot Telegram | `/revoke` ke @BotFather → token baru (`TELEGRAM_BOT_TOKEN`) |

## 4. Perbarui Vercel
1. Vercel → project → **Settings** → **Environment Variables**.
2. Update ketiga variabel Supabase dengan nilai baru (Production + Preview + Development).
3. **Redeploy** agar env baru terpakai.

## 5. Perbarui Supabase Redirect URLs
Auth → **URL Configuration** → **Site URL** dan **Redirect URLs**:
```
https://upk-kr-konseling.vercel.app
https://upk-kr-konseling.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

## 6. Audit akses tak dikenal
- Supabase → **Logs** → **Postgres Logs** dan **API Logs**: cari query massal
  atau login dari IP asing **sebelum** rotasi.
- Ganti password akun Supabase bila ada kecurigaan, dan aktifkan 2FA.
- Jalankan pemeriksaan akun berperan tinggi (ada di `supabase/hotfix-security.sql`
  bagian **A2**) — cocokkan hasilnya dengan orang yang kamu kenal.

## 7. Bersihkan riwayat git (SETELAH rotasi selesai)

Jangan lakukan ini sebelum rotasi — tidak ada gunanya. Salinan lama mungkin
sudah dipegang pihak lain.

Kalau repo tetap ingin publik, riwayat harus ditulis ulang:

```bash
pip install git-filter-repo
git filter-repo --path .env.local --path .env.example --invert-paths
git push --force origin main
```

Lalu minta GitHub menghapus cache commit lama (buka GitHub Support).

## 8. Pastikan tidak terulang
- `.gitignore` sudah mengecualikan **semua** `.env*` kecuali `.env.example`.
- `.env.example` kini hanya berisi placeholder (`your-anon-key`, dst.).
- Jangan pernah menaruh kunci asli di `.env.example`, `vercel.json`, atau file kode.
- Aktifkan **GitHub Secret Scanning** + **Push Protection** di repo
  (Settings → Code security and analysis) — GitHub akan menolak push yang
  memuat kunci yang dikenali.

> Setelah rotasi selesai, semua sesi lama tidak valid (JWT ditandatangani ulang
> saat login berikutnya). Jika Anda memakai `NEXT_PUBLIC_*`, build ulang Vercel.
