// src/app/(app)/admin/privasi/actions.ts
// Privasi (M13): tangani permintaan ekspor/hapus data + log pembukaan identitas.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'

const handleSchema = z.object({
  id: z.string().uuid('ID permintaan tidak valid.'),
  status: z.enum(['processing', 'completed', 'rejected']),
  note: z.string().trim().min(5, 'Catatan minimal 5 karakter.').max(1000),
})

const handleImpl = cmsAction({
  cap: 'managePrivacy',
  entity: 'data_requests',
  action: 'update',
  requireReason: true,
  schema: handleSchema,
  load: async ({ id }, db) => {
    const { data } = await db
      .from('data_requests')
      .select('id, user_id, kind, status')
      .eq('id', id)
      .maybeSingle()
    if (!data) throw new Error('Permintaan tidak ditemukan.')
    return data
  },
  run: async (ctx, input, db) => {
    const payload = {
      status: input.status,
      note: input.note,
      handled_by: ctx.userId,
      handled_at: new Date().toISOString(),
    }
    const { error } = await db
      .from('data_requests')
      .update(payload as never)
      .eq('id', input.id)
    if (error) throw new Error(error.message)
    return { id: input.id, after: payload, data: { status: input.status } }
  },
  revalidate: ['/admin/privasi'],
})

export async function handleDataRequest(input: unknown) {
  return handleImpl(input)
}
