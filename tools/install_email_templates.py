#!/usr/bin/env python3
"""
Pasang template email dan perbaiki URL konfigurasi Supabase Auth.

MENGAPA PERLU SKRIP
  Dua hal di bawah hanya bisa diubah lewat Dashboard atau Management API —
  tidak lewat SQL:
    1. Site URL / Redirect URLs (Authentication -> URL Configuration)
    2. Isi template email (Authentication -> Email Templates)

  Nilai `site_url` yang salah adalah akar dari tautan email yang mendarat di
  `localhost:3000` milik penerima. Sudah dibuktikan: aplikasi mengirim
  `redirect_to=http://localhost:3002/...` tetapi Supabase mengabaikannya dan
  memakai `site_url`.

CARA PAKAI
  1. Buat Personal Access Token di https://supabase.com/dashboard/account/tokens
  2. Jalankan (jangan menempel token ke chat atau ke berkas repo):

       SUPABASE_ACCESS_TOKEN=sbp_xxx python tools/install_email_templates.py --dry-run
       SUPABASE_ACCESS_TOKEN=sbp_xxx python tools/install_email_templates.py

  `--dry-run` hanya menampilkan apa yang akan diubah.

  Bila tidak mau memakai token, tempel manual: buka setiap berkas di
  supabase/email-templates/, salin seluruh isinya ke Dashboard, dan isi Site URL
  dengan https://upk-kr-konseling.vercel.app.

YANG DILAKUKAN
  - Site URL          -> https://upk-kr-konseling.vercel.app
  - Redirect URLs     -> domain produksi + localhost:3000/3002 untuk dev
  - Template          -> confirm-signup, reset-password, change-email, magic-link
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "supabase" / "email-templates"
PROJECT_REF = "aslvltjvqnpedmnarkea"
API = "https://api.supabase.com/v1"

SITE_URL = "https://upk-kr-konseling.vercel.app"
REDIRECT_URLS = [
    "https://upk-kr-konseling.vercel.app/**",
    "http://localhost:3000/**",
    "http://localhost:3002/**",
]

# nama template di Management API -> (berkas, subjek)
TEMPLATE_MAP = {
    "confirmation": ("confirm-signup.html", "Aktifkan akun IKA UPK-Kr FT UNSRAT"),
    "recovery": ("reset-password.html", "Atur ulang kata sandi IKA UPK-Kr FT UNSRAT"),
    "email_change": ("change-email.html", "Konfirmasi perubahan email IKA UPK-Kr FT UNSRAT"),
    "magic_link": ("magic-link.html", "Tautan masuk IKA UPK-Kr FT UNSRAT"),
}


def request(method: str, path: str, token: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:300]
        if exc.code == 401:
            raise SystemExit(
                "401 Unauthorized — token ditolak Supabase.\n"
                "\n"
                "Periksa tiga hal ini:\n"
                "  1. Token dibuat di https://supabase.com/dashboard/account/tokens\n"
                "     (Personal Access Token), BUKAN di Settings -> API proyek.\n"
                "  2. Token diawali 'sbp_'. Kalau tidak, itu kunci yang salah.\n"
                "  3. Token belum dicabut dan tidak terpotong saat disalin.\n"
                "\n"
                f"Yang terbaca: panjang {len(token)} karakter, "
                f"awalan {token[:4]!r}, akhiran {token[-2:]!r}.\n"
                "Kalau ada spasi di dalamnya, hapus — itu sebab paling sering.\n"
                f"\nRespons Supabase: {detail}"
            )
        if exc.code == 403:
            raise SystemExit(
                "403 Forbidden — token valid tetapi tidak punya akses ke proyek "
                f"{PROJECT_REF}.\nPastikan akun pemilik token adalah anggota proyek ini.\n"
                f"\nRespons Supabase: {detail}"
            )
        if exc.code == 404:
            raise SystemExit(
                f"404 Not Found — proyek {PROJECT_REF} tidak ditemukan oleh token ini.\n"
                "Periksa PROJECT_REF di berkas ini terhadap ref proyek di Dashboard.\n"
                f"\nRespons Supabase: {detail}"
            )
        raise SystemExit(f"HTTP {exc.code} dari Management API.\n{detail}")


def read_template(name: str) -> tuple[str, str]:
    """Ambil (subjek, isi) dari berkas HTML."""
    file_name, fallback_subject = TEMPLATE_MAP[name]
    body = (TEMPLATES / file_name).read_text(encoding="utf-8")

    match = re.search(r"SUBJEK:\s*(.+)", body)
    subject = match.group(1).strip() if match else fallback_subject

    # Buang komentar petunjuk di kepala berkas: isinya instruksi untuk operator,
    # tidak ada gunanya di dalam email yang dibaca pengguna.
    body = re.sub(r"<!--.*?-->", "", body, count=1, flags=re.S).lstrip()
    return subject, body


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="tampilkan perubahan saja")
    args = parser.parse_args()

    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not token:
        print("SUPABASE_ACCESS_TOKEN belum diset.", file=sys.stderr)
        print("Buat di https://supabase.com/dashboard/account/tokens lalu jalankan:", file=sys.stderr)
        print("  SUPABASE_ACCESS_TOKEN=sbp_xxx python tools/install_email_templates.py", file=sys.stderr)
        return 2

    # Periksa bentuk token SEBELUM memanggil API. Kesalahan yang paling sering
    # adalah memakai anon/service_role key proyek (JWT panjang, diawali 'eyJ')
    # atau service_role key baru ('sb_secret_'), yang keduanya bukan token
    # Management API dan selalu berakhir 401 dengan pesan yang tidak menjelaskan.
    if not token.startswith("sbp_"):
        kind = (
            "kunci proyek (anon/service_role)"
            if token.startswith(("eyJ", "sb_secret_", "sb_publishable_"))
            else "nilai yang tidak dikenal"
        )
        raise SystemExit(
            f"SUPABASE_ACCESS_TOKEN berisi {kind}, bukan Personal Access Token.\n"
            "\n"
            "Yang dibutuhkan adalah token AKUN, dibuat di:\n"
            "  https://supabase.com/dashboard/account/tokens  -> Generate new token\n"
            "Bentuknya: sbp_ diikuti ~40 karakter.\n"
            "\n"
            "Kunci di Settings -> API proyek TIDAK bisa dipakai di sini — kunci itu\n"
            "untuk aplikasi, bukan untuk Management API.\n"
            f"\n(terbaca: panjang {len(token)}, awalan {token[:7]!r})"
        )

    # ── 1. URL konfigurasi ────────────────────────────────────────────────
    print("Membaca konfigurasi auth saat ini...")
    current = request("GET", f"/projects/{PROJECT_REF}/config/auth", token)
    print(f"  site_url saat ini      : {current.get('site_url')!r}")
    print(f"  uri_allow_list saat ini: {current.get('uri_allow_list')!r}")

    if current.get("site_url") == SITE_URL:
        print("  site_url sudah benar, dilewati.")
    else:
        print(f"  -> akan diubah menjadi {SITE_URL!r}")

    if args.dry_run:
        for name in TEMPLATE_MAP:
            subject, body = read_template(name)
            print(f"  template {name:14} {len(body):>6} byte | subjek: {subject}")
        print("\n(--dry-run: tidak ada yang diubah)")
        return 0

    request(
        "PATCH",
        f"/projects/{PROJECT_REF}/config/auth",
        token,
        {
            "site_url": SITE_URL,
            "uri_allow_list": ",".join(REDIRECT_URLS),
        },
    )
    print("  URL konfigurasi diperbarui.")

    # ── 2. Template email ─────────────────────────────────────────────────
    for name in TEMPLATE_MAP:
        subject, body = read_template(name)
        # Isi template yang ada dipertahankan; hanya dua kolom ini yang diubah.
        request(
            "PATCH",
            f"/projects/{PROJECT_REF}/config/auth",
            token,
            {
                "mailer_subjects_" + name: subject,
                "mailer_templates_" + name + "_content": body,
            },
        )
        print(f"  template {name:14} dipasang ({len(body)} byte)")

    print("\nSelesai. Uji dengan mendaftar memakai alamat email sungguhan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
