#!/usr/bin/env python3
"""
Lint penjaga izin PL/pgSQL yang tidak tahan NULL.

Kenapa ada: `is_super_admin()` mengembalikan NULL saat tidak ada sesi.
Di RLS ini gagal tertutup (NULL tidak lolos), tetapi di PL/pgSQL
`IF NOT NULL` TIDAK masuk ke cabang — penjaganya justru terlewati.

Terbukti nyata: `break_glass_open_session` berjalan tanpa sesi lalu gagal di
NOT NULL kolom `actor_id`, bukan di pemeriksaan "hanya super admin". Kalau
`actor_id` kebetulan punya DEFAULT, pembacaan isi chat privat akan lolos.

Aturan: di dalam blok `AS $$ ... $$`, jangan pakai `IF NOT <predikat>` atau
`IF NOT (a OR b)` bila predikatnya bisa NULL. Pakai `IS NOT TRUE`.

Dipakai: python tools/lint_sql_null_guards.py [berkas...]
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Predikat yang mengembalikan NULL saat auth.uid() NULL.
RISKY = r"(?:public\.)?(?:is_super_admin|is_admin_or_above|is_moderator_or_above|has_min_role|current_user_role)"

# `IF NOT risky(...)` atau `IF NOT (risky(...) ...`
BAD_IF_NOT = re.compile(r"\bIF\s+NOT\s*\(?\s*" + RISKY + r"\s*\(", re.I)
# `AND NOT risky(` di dalam kondisi yang sama.
BAD_AND_NOT = re.compile(r"\bAND\s+NOT\s+" + RISKY + r"\s*\(", re.I)
# Bentuk aman.
GOOD = re.compile(r"IS\s+NOT\s+TRUE", re.I)


def check(path: pathlib.Path):
    text = path.read_text(encoding="utf-8")
    findings = []

    # Hanya periksa isi blok fungsi (di antara AS $$ ... $$).
    for m in re.finditer(r"AS\s*\$\$(.*?)\$\$", text, re.S):
        body = m.group(1)
        offset = m.start(1)
        for rx in (BAD_IF_NOT, BAD_AND_NOT):
            for hit in rx.finditer(body):
                line_no = text.count("\n", 0, offset + hit.start()) + 1
                snippet = body[hit.start(): hit.start() + 70].split("\n")[0].strip()
                findings.append((line_no, snippet))

    # Fungsi pembantu yang mengembalikan NULL tanpa COALESCE.
    for m in re.finditer(
        r"CREATE OR REPLACE FUNCTION\s+public\.(\w+)\s*\(\s*\)\s*RETURNS BOOLEAN(.*?)AS\s*\$\$(.*?)\$\$",
        text,
        re.S | re.I,
    ):
        name, _tail, body = m.group(1), m.group(2), m.group(3)
        safe_delegate = "has_min_role" in body.lower()
        if (
            not safe_delegate
            and "COALESCE" not in body.upper()
            and "IS NULL" not in body.upper()
        ):
            line_no = text.count("\n", 0, m.start()) + 1
            findings.append((line_no, f"{name}() RETURNS BOOLEAN tanpa COALESCE — bisa NULL"))
    return findings


def main():
    targets = [pathlib.Path(a) for a in sys.argv[1:]]
    if not targets:
        targets = sorted((ROOT / "supabase").glob("*.sql"))

    total = 0
    for p in targets:
        findings = check(p)
        if findings:
            total += len(findings)
            print(f"!!  {p.name}")
            for line_no, snippet in findings:
                print(f"      baris {line_no}: {snippet}")

    if total:
        print(f"\n{total} penjaga izin tidak tahan NULL. Ganti `IF NOT x()` -> `IF x() IS NOT TRUE`.")
        return 1

    print("NULL_GUARD_OK — semua penjaga izin di blok fungsi tahan NULL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
