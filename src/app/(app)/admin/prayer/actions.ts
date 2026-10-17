// src/app/(app)/admin/prayer/actions.ts
// Aksi khusus modul permohonan doa.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'

/**
 * Tandai permohonan sudah didoakan (atau lepas tandanya).
 * Tanpa alasan — ini penandaan administratif yang tidak menyembunyikan apa pun.
 */
const markPrayerAnsweredImpl = cmsAction({
  cap: 'moderateContent',
  entity: 'prayer_requests',
  action: 'update',
  schema: z.object({
    id: z.string().uuid('ID tidak valid.'),
    answered: z.boolean(),
  }),
  load: async ({ id }, db) => {
    const { data, error } = await db
      .from('prayer_requests')
      .select('id, is_answered')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ?? undefined
  },
  run: async (_ctx, { id, answered }, db) => {
    const { error } = await db
      .from('prayer_requests')
      .update({ is_answered: answered })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { id, after: { is_answered: answered }, data: { id } }
  },
  revalidate: ['/admin/prayer', '/prayer'],
})

/** Pembungkus Server Action — lihat catatan di lib/cms/content-actions.ts. */
export async function markPrayerAnswered(input: unknown) {
  return markPrayerAnsweredImpl(input)
}
