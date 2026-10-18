/**
 * Template email transaksional — dipakai di Supabase Dashboard →
 * Authentication → Email Templates.
 *
 * CARA PAKAI
 *   Buka supabase/email-templates/*.html, salin seluruh isinya, tempel ke kolom
 *   isi template yang sesuai. Subjek ada di baris pertama tiap berkas sebagai
 *   komentar, dan juga di daftar di bawah.
 *
 * Variabel Supabase yang dipakai:
 *   {{ .ConfirmationURL }}  tautan aksi (verifikasi / reset / ubah email)
 *   {{ .Email }}            alamat penerima
 *   {{ .Token }}            kode 6 angka (bila memakai OTP)
 *
 * ATURAN DESAIN
 *   - Tabel, bukan flexbox/grid: klien email (Outlook, Gmail) tidak mendukung
 *     layout modern. Satu-satunya yang andal adalah <table>.
 *   - Gaya inline, bukan <style>: Gmail membuang <style> di beberapa konteks.
 *   - Lebar maksimum 600px, satu kolom.
 *   - Logo memakai URL absolut ke domain produksi. Path relatif tidak berfungsi
 *     di email.
 *   - Warna sama dengan aplikasi: cokelat gelap #3A2718, terra #C4895A,
 *     krem #FBF7F1.
 */

export const EMAIL_TEMPLATES = [
  {
    file: 'confirm-signup.html',
    name: 'Confirm signup',
    subject: 'Aktifkan akun IKA UPK-Kr FT UNSRAT',
  },
  {
    file: 'reset-password.html',
    name: 'Reset password',
    subject: 'Atur ulang kata sandi IKA UPK-Kr FT UNSRAT',
  },
  {
    file: 'change-email.html',
    name: 'Change email address',
    subject: 'Konfirmasi perubahan email IKA UPK-Kr FT UNSRAT',
  },
  {
    file: 'magic-link.html',
    name: 'Magic Link',
    subject: 'Tautan masuk IKA UPK-Kr FT UNSRAT',
  },
] as const
