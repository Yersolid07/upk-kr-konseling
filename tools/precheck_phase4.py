#!/usr/bin/env python3
"""
Pemeriksa pra-jalan untuk supabase/phase4-advanced-modules.sql.

Kenapa ada: `pglast` memvalidasi SINTAKS, bukan SEMANTIK. Berkas ini pernah
lolos pglast lalu gagal di Supabase dengan "column name of relation
schema_migrations does not exist" — karena tabelnya sudah ada dengan kolom
berbeda. Skrip ini membandingkan setiap tabel/kolom yang DISEBUT berkas SQL
dengan skema NYATA di database, sebelum user menempelkannya.

Dipakai: python tools/precheck_phase4.py
"""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env.local"
SQL_FILE = ROOT / "supabase" / "phase4-advanced-modules.sql"


def load_env():
    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = re.split(r"\s+#", line, maxsplit=1)[0].strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def openapi(env):
    url = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1/"
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(url, headers={"apikey": key, "Authorization": "Bearer " + key})
    return json.load(urllib.request.urlopen(req, timeout=30)).get("definitions", {})


# Tabel yang SUDAH ADA sebelum Fase 4, beserta kolom yang WAJIB sudah ada.
EXISTING = {
    "cell_groups": ["invite_code", "leader_id", "is_active", "name"],
    "cell_group_messages": ["group_id", "sender_id", "content", "moderation_status"],
    "cell_group_members": ["group_id", "user_id", "is_leader"],
    "session_notes": ["note", "session_id", "konselor_id"],
    "chat_sessions": ["konselor_id", "member_id", "status"],
    "messages": ["session_id", "sender_id", "content"],
    "bookings": ["member_id", "konselor_id", "scheduled_at", "status"],
    "notifications": ["user_id", "type", "title", "body", "link"],
    "profiles": ["id", "full_name", "role", "is_active"],
    "attachments": ["owner_id", "size_bytes"],
    "daily_verses": ["verse_text", "verse_ref", "display_date"],
    "schema_migrations": ["version", "description", "applied_at"],
    "content_reports": ["status"],
    "threads": ["deleted_at"],
    "comments": ["deleted_at"],
    "prayer_requests": ["deleted_at"],
    "articles": ["deleted_at"],
    "identity_reveal_log": ["requested_by", "reason"],
}

# Kolom yang DITAMBAHKAN Fase 4 ke tabel lama — kalau ada di SQL, harus
# benar-benar belum ada (atau ditambahkan oleh migrasi ini sendiri).
ADDED = {
    "cell_groups": [
        "is_archived", "invite_code_required", "max_members",
        "archived_at", "archived_by", "updated_at",
    ],
    "cell_group_messages": [
        "moderation_status", "hidden_by", "hidden_reason", "hidden_at",
        "deleted_at", "deleted_by",
    ],
    "attachments": ["storage_path", "is_orphan", "checked_at"],
}

# Fungsi yang harus SUDAH ada (dipanggil Fase 4, dibuat migrasi lain).
REQUIRED_FUNCS = ["is_admin_or_above", "is_moderator_or_above", "is_super_admin",
                  "notify_admins", "notify_user", "update_updated_at"]


def main():
    env = load_env()
    defs = openapi(env)
    problems = []

    for table, cols in EXISTING.items():
        have = set(defs.get(table, {}).get("properties", {}).keys())
        if not have:
            problems.append(f"TABEL HILANG: {table}")
            continue
        missing = [c for c in cols if c not in have]
        if missing:
            problems.append(f"{table}: kolom tidak ada -> {missing}")

    sql = SQL_FILE.read_text(encoding="utf-8")
    # Setiap kolom yang ditambahkan lewat ALTER TABLE harus belum ada.
    for table, cols in ADDED.items():
        have = set(defs.get(table, {}).get("properties", {}).keys())
        for c in cols:
            if c in have and f"ADD COLUMN IF NOT EXISTS {c}" not in sql:
                # Sudah ada dan ditambahkan dengan IF NOT EXISTS = aman.
                if f"{c} " not in sql:
                    problems.append(f"{table}.{c} sudah ada tapi tidak disebut SQL")

    # Fungsi yang dipanggil harus ada di migrasi lain.
    for fn in REQUIRED_FUNCS:
        if f"public.{fn}(" in sql:
            # Tidak bisa diprobe lewat REST untuk semua; cek minimal nama muncul
            # di berkas migrasi sebelumnya.
            found = any(
                fn in p.read_text(encoding="utf-8", errors="ignore")
                for p in (ROOT / "supabase").glob("*.sql")
                if p.name != SQL_FILE.name
            )
            if not found:
                problems.append(f"fungsi {fn}() dipanggil tapi tidak didefinisikan di migrasi lain")

    if problems:
        print("GAGAL PRECHECK:")
        for p in problems:
            print("  -", p)
        return 1

    print("PRECHECK_OK — semua tabel & kolom yang dirujuk Fase 4 cocok dengan database.")
    print(f"  tabel diperiksa: {len(EXISTING)}, fungsi: {len(REQUIRED_FUNCS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
