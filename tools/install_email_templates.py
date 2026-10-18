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
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


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
