# 🕊️ UPK-Kr. FT. UNSRAT Konseling Platform
## Panduan Setup & Deployment Lengkap

---

## 📁 Struktur Proyek

```
upk-konseling/
├── supabase/
│   ├── schema.sql          ← Semua tabel + trigger + fungsi
│   ├── rls.sql             ← Row Level Security policies
│   └── realtime.sql        ← Enable realtime pada tabel
│
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Root layout + font + Toaster
│   │   ├── globals.css         ← Design system + CSS variables
│   │   ├── dashboard/page.tsx  ← Dashboard utama
│   │   ├── forum/page.tsx      ← Forum diskusi
│   │   ├── chat/page.tsx       ← Konseling 1-on-1
│   │   ├── booking/page.tsx    ← Booking sesi
│   │   ├── prayer/page.tsx     ← Prayer wall
│   │   ├── renungan/page.tsx   ← Artikel & renungan
│   │   ├── resource/page.tsx   ← Resource kesehatan
│   │   ├── cellgroup/page.tsx  ← Cell group
│   │   ├── konselor/page.tsx   ← Dashboard konselor
│   │   ├── admin/page.tsx      ← Panel admin
│   │   └── auth/
│   │       ├── actions.ts          ← Server actions: login, register, logout
│   │       ├── login/page.tsx      ← Halaman login
│   │       └── register/page.tsx   ← Halaman register (member only)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx    ← Shell dengan sidebar + topbar
│   │   │   ├── Sidebar.tsx     ← Sidebar navigasi
│   │   │   └── Topbar.tsx      ← Header dengan notif & anon toggle
│   │   └── ui/
│   │       └── SOSModal.tsx    ← Modal darurat SOS
│   │
│   ├── hooks/
│   │   ├── useRealtimeChat.ts          ← Realtime chat via Supabase
│   │   ├── useRealtimeNotifications.ts ← Push notif realtime
│   │   └── usePresence.ts              ← Online status tracking
│   │
│   ├── lib/supabase/
│   │   ├── client.ts   ← Browser Supabase client
│   │   └── server.ts   ← Server Supabase client + admin client
│   │
│   ├── store/
│   │   └── useAppStore.ts  ← Zustand global state
│   │
│   └── types/
│       └── database.ts ← TypeScript types semua tabel
│
├── middleware.ts       ← Auth protection + role-based routing
├── next.config.ts
├── vercel.json
├── tailwind.config.ts
├── package.json
└── .env.example
```

---

## 🚀 STEP 1: Setup Supabase

### 1.1 Buat Project Supabase
1. Buka [supabase.com](https://supabase.com) → **New Project**
2. Nama: `upk-kr-konseling`
3. Region: **Singapore** (terdekat dari Manado)
4. Password: simpan baik-baik

### 1.2 Jalankan SQL Schema
Di Supabase → **SQL Editor**, jalankan file-file berikut **secara berurutan**:

```
1. supabase/schema.sql   ← Tabel, trigger, fungsi
2. supabase/rls.sql      ← Row Level Security
3. supabase/realtime.sql ← Enable realtime
```

### 1.3 Ambil API Keys
Supabase → **Project Settings** → **API**:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (**JANGAN expose ke client!**)

### 1.4 Konfigurasi Auth Email
Supabase → **Authentication** → **Email Templates**:
- Ganti template "Confirm signup" dan "Reset Password" dengan teks dalam bahasa Indonesia
- Tambahkan domain Vercel-mu ke **Redirect URLs**

### 1.5 Buat Super Admin pertama
Setelah ada 1 akun yang mendaftar via aplikasi, jalankan SQL ini untuk menjadikannya super_admin:

```sql
UPDATE profiles
SET role = 'super_admin', is_verified = true
WHERE id = 'USER_ID_DARI_SUPABASE_AUTH';
```

---

## 🖥️ STEP 2: Setup Next.js Lokal

```bash
# Clone / copy folder ini
cd upk-konseling

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Isi semua nilai di .env.local

# Jalankan dev server
npm run dev
# Buka http://localhost:3000
```

---

## ☁️ STEP 3: Deploy ke Vercel

### 3.1 Push ke GitHub
```bash
git init
git add .
git commit -m "feat: initial UPK-Kr Konseling platform"
git remote add origin https://github.com/USERNAME/upk-kr-konseling.git
git push -u origin main
```

### 3.2 Deploy via Vercel
1. Buka [vercel.com](https://vercel.com) → **New Project**
2. Import repo GitHub di atas
3. Framework: **Next.js** (auto-detected)
4. **Environment Variables** — tambahkan semua dari `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - *(optional)* `RESEND_API_KEY`, `FONNTE_TOKEN`, dsb
5. Klik **Deploy** 🎉

### 3.3 Update Supabase Redirect URL
Supabase → Auth → URL Configuration → **Site URL**:
```
https://upk-kr-konseling.vercel.app
```

---

## 🔐 STEP 4: Alur Role & Keamanan

### Cara Menambah Konselor (Admin)
1. Login sebagai admin/super_admin
2. Buka **/admin** → Tab **Semua Pengguna**
3. Cari nama pengguna yang ingin dijadikan konselor
4. Klik **Ubah Role** → pilih **Konselor** ✓
5. Pengguna otomatis mendapat notifikasi di-app

> ⚠️ **Tidak ada pilihan "daftar sebagai konselor" di form registrasi.**
> Semua pendaftar baru otomatis menjadi **Anggota (member)**.
> Konselor **hanya** bisa diassign oleh admin/super_admin melalui Panel Admin.

### Hierarki Role
```
super_admin  ──→  Semua akses + buka identitas darurat
    ↓
  admin      ──→  Kelola user, assign konselor, moderasi
    ↓
moderator    ──→  Pin/lock thread, review laporan
    ↓
konselor     ──→  Terima sesi, dashboard khusus, buat artikel
    ↓
member       ──→  Forum, chat, booking, prayer wall
```

### Sistem Anonimitas
- Setiap user punya `anon_token` unik (8 hex chars, misal `a3f9b2c1`)
- Saat `is_anonymous = true`, nama ditampilkan sebagai `Anonim#A3F9`
- **Hanya super_admin** bisa membuka identitas asli via audit-logged endpoint
- Setiap pembukaan identitas dicatat di tabel `identity_reveal_log`

---

## ⚡ STEP 5: Fitur Realtime

Fitur yang berjalan **real-time** tanpa refresh:
| Fitur | Teknologi |
|-------|-----------|
| Chat 1-on-1 | Supabase Realtime (postgres_changes) |
| Notifikasi | Supabase Realtime (postgres_changes) |
| Status Online | Supabase Presence channel |
| Prayer Wall reaksi | Supabase Realtime |
| Forum komentar baru | Supabase Realtime |
| Cell Group chat | Supabase Realtime |

---

## 📲 STEP 6: Notifikasi Multi-channel

### In-app (sudah jalan)
Otomatis via `useRealtimeNotifications` hook

### Email (via Resend)
```bash
npm install resend
# Tambahkan RESEND_API_KEY ke .env.local
```
Gunakan di server actions saat kirim notifikasi penting (booking confirmed, dsb)

### WhatsApp SOS (via Fonnte)
```env
FONNTE_TOKEN=xxxxxxxx
NEXT_PUBLIC_SOS_WA_NUMBER=628xxxxxxxxx
```
Uncomment baris Fonnte di `/src/app/api/sos/route.ts`

### Push Notification (Browser)
Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```
Tambahkan ke `.env.local` dan implementasi Service Worker di `/public/sw.js`

---

## 🎨 Kustomisasi

### Ganti Ayat Harian
Insert ke tabel `daily_verses`:
```sql
INSERT INTO daily_verses (verse_text, verse_ref, display_date)
VALUES (
  '"Mazmur 23:1"',
  'Mazmur 23:1',
  '2026-03-15'
);
```

### Tambah Kategori Forum
```sql
INSERT INTO thread_categories (name, name_en, slug, icon, color, sort_order)
VALUES ('Pernikahan', 'Marriage', 'pernikahan', '💍', '#8B5CF6', 9);
```

### Buat Cell Group Pertama
```sql
INSERT INTO cell_groups (name, description, leader_id)
VALUES (
  'PA Teknik Informatika',
  'Kelompok Pendalaman Alkitab mahasiswa & alumni Teknik Informatika UNSRAT',
  'LEADER_USER_ID'
);
```

---

## 📊 Performa & Skalabilitas

Setup ini dirancang untuk **< 1.000 pengguna** dengan:
- Vercel (Free/Pro tier) — serverless, auto-scale
- Supabase (Free tier = 500MB DB, 2GB bandwidth) → upgrade ke Pro ($25/bln) kalau perlu
- Supabase Realtime — max 200 concurrent connections di Free tier
  - Upgrade ke Pro untuk 500+ concurrent

**Estimasi biaya saat ini: $0/bulan** untuk <500 user aktif

---

## 🛡️ Checklist Keamanan

- [x] RLS aktif di semua tabel
- [x] Konselor hanya bisa diassign admin (tidak bisa self-register)
- [x] Service role key tidak pernah dikirim ke client
- [x] Identity reveal hanya super_admin + audit log
- [x] SOS alert broadcast ke semua konselor
- [x] Password minimum 8 karakter (enforced di Supabase)
- [x] HTTP security headers di vercel.json
- [ ] Rate limiting pada API routes (tambahkan dengan `upstash/ratelimit`)
- [ ] Email verification (aktifkan di Supabase Auth settings)

---

## 🆘 Troubleshooting

**Build error: "Module not found"**
```bash
npm install  # Pastikan semua dependency terinstall
```

**Supabase RLS error: "new row violates row-level security"**
→ Cek user sudah login dan memiliki role yang sesuai

**Realtime tidak bekerja**
→ Pastikan tabel sudah di-add ke `supabase_realtime` publication (jalankan `realtime.sql`)

**Chat pesan tidak muncul real-time**
→ Cek browser console untuk error Supabase channel subscription

---

*Kiranya platform ini menjadi berkat bagi komunitas UPK-Kr. FT. UNSRAT 🙏*
*"Karena itu, saling menghiburlah dan saling membangunlah" — 1 Tesalonika 5:11*
