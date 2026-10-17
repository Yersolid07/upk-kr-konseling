"""Validasi sintaks SQL migrasi Fase 1 dengan parser PostgreSQL asli (pglast).

Bukan sekadar cek keseimbangan tanda kurung: pglast memakai parser libpg_query
(server PostgreSQL asli), jadi DDL yang tidak valid akan gagal di sini sebelum
user menempelkannya ke Supabase SQL Editor.
"""
import sys
from pathlib import Path

from pglast import parse_sql

FILES = [
    "supabase/hotfix-security.sql",
    "supabase/phase1-data-security.sql",
    "supabase/cms-superadmin.sql",
]

root = Path(__file__).resolve().parent.parent
fail = 0

for rel in FILES:
    path = root / rel
    if not path.exists():
        print(f"LEWAT  {rel} (tidak ada)")
        continue
    sql = path.read_text(encoding="utf-8")
    try:
        stmts = parse_sql(sql)
    except Exception as exc:  # noqa: BLE001
        print(f"GAGAL  {rel}")
        print(f"       {type(exc).__name__}: {exc}")
        fail += 1
        continue

    kinds: dict[str, int] = {}
    for s in stmts:
        kind = type(s.stmt).__name__
        kinds[kind] = kinds.get(kind, 0) + 1
    ringkas = ", ".join(f"{k}={v}" for k, v in sorted(kinds.items()))
    print(f"OK     {rel}  ({len(stmts)} statement)")
    print(f"       {ringkas}")

print()
print("SEMUA_SQL_VALID" if fail == 0 else f"{fail} BERKAS GAGAL")
sys.exit(1 if fail else 0)
