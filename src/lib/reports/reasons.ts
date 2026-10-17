// src/lib/reports/reasons.ts
// Daftar alasan laporan yang baku.
//
// Dipisah dari report-actions.ts karena berkas ber-'use server' hanya boleh
// mengekspor fungsi async — konstanta di sana membuat build gagal.

export const REPORT_REASONS = [
  { key: 'spam', label: 'Spam atau iklan' },
  { key: 'pelecehan', label: 'Pelecehan atau ancaman' },
  { key: 'ujaran-kebencian', label: 'Ujaran kebencian' },
  { key: 'konten-dewasa', label: 'Konten dewasa' },
  { key: 'informasi-palsu', label: 'Informasi menyesatkan' },
  { key: 'bahaya-diri', label: 'Menunjukkan bahaya pada diri sendiri' },
  { key: 'lainnya', label: 'Alasan lain' },
] as const

export type ReportReasonKey = (typeof REPORT_REASONS)[number]['key']

export const REPORT_REASON_KEYS = REPORT_REASONS.map((r) => r.key) as ReportReasonKey[]

/** Label ramah untuk kunci alasan. */
export function reasonLabel(key: string): string {
  return REPORT_REASONS.find((r) => r.key === key)?.label ?? key
}

export type ReportContentType = 'thread' | 'comment' | 'prayer' | 'article' | 'message'
