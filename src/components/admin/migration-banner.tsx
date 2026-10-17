// src/components/admin/migration-banner.tsx
// Pemberitahuan bahwa migrasi database belum dijalankan.
//
// Ditampilkan di dalam halaman, bukan menggantikan halaman: admin tetap bisa
// melihat modul lain yang tidak bergantung pada kolom baru. Pesannya menyebut
// nama berkas SQL secara eksplisit supaya bisa langsung ditindaklanjuti.

import { AlertTriangle } from 'lucide-react'

export function MigrationBanner({
  file,
  detail,
}: {
  file: string
  detail?: string
}) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0 text-sm text-amber-900">
          <p className="font-bold">Migrasi database belum dijalankan</p>
          <p className="mt-1 text-xs leading-relaxed">
            Jalankan <code className="font-mono font-semibold">{file}</code> di Supabase
            SQL Editor, lalu muat ulang halaman ini. Fitur di halaman ini memerlukan
            kolom yang dibuat oleh migrasi tersebut.
          </p>
          {detail && (
            <p className="mt-1.5 text-[11px] font-mono text-amber-800/80 break-all">
              {detail}
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-amber-800">
            Urutan lengkap: lihat <code className="font-mono">JALANKAN-MIGRASI.md</code> di
            akar proyek.
          </p>
        </div>
      </div>
    </div>
  )
}
