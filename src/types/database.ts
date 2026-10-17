// src/types/database.ts
// TypeScript types matching Supabase schema

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'konselor' | 'member'
export type SessionStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'
export type NotificationType =
  | 'new_message' | 'new_comment' | 'new_reaction'
  | 'booking_confirmed' | 'booking_cancelled'
  | 'prayer_support' | 'sos_alert' | 'system'
  | 'konselor_verified' | 'new_thread' | 'session_request'
export type ContentType = 'thread' | 'comment' | 'message' | 'prayer'
export type PublicationStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
/**
 * Status moderasi bersama untuk semua tabel konten (Fase 2).
 * 'visible' default; 'hidden' = disembunyikan staf; 'pending'/'rejected'
 * dipakai artikel pada alur persetujuan.
 */
export type ModerationStatus = 'visible' | 'hidden' | 'pending' | 'rejected'
export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
export type AttachmentKind = 'image' | 'video' | 'audio' | 'document' | 'link' | 'embed'
export type ContentKind =
  | 'thread' | 'comment' | 'article' | 'prayer_request'
  | 'cell_group_message' | 'chat_message' | 'profile'

// ─────────────────────────────────────────────────────────────
// CATATAN: tipe domain di bawah memakai `type`, BUKAN `interface`.
// Alasannya konkret: @supabase/postgrest-js mewajibkan setiap Row/Insert/Update
// memenuhi `Record<string, unknown>`. Interface di TypeScript tidak punya
// implicit index signature sehingga TIDAK assignable ke Record<string, unknown>
// — akibatnya .insert()/.update()/.rpc() semuanya jatuh ke tipe `never`.
// Jangan ubah kembali ke `interface`.
// ─────────────────────────────────────────────────────────────
export type Attachment = {
  id: string
  owner_id: string
  content_type: ContentKind
  content_id: string | null
  kind: AttachmentKind
  url: string
  title: string | null
  mime_type: string | null
  size_bytes: number | null
  sort_order: number
  // Fase 4 (M12): jalur objek di Storage + penanda berkas yatim.
  storage_path: string | null
  is_orphan: boolean
  checked_at: string | null
  created_at: string
}

export type HotlineContact = {
  id: string
  name: string
  description: string | null
  number: string
  display: string | null
  type: 'phone' | 'whatsapp' | 'url'
  note: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LegalDocument = {
  slug: string
  title: string
  summary: string | null
  content: string
  version: number
  effective_date: string | null
  is_published: boolean
  updated_by: string | null
  updated_at: string
}

export type SiteSetting = {
  key: string
  value: Record<string, unknown>
  description: string | null
  updated_by: string | null
  updated_at: string
}

export type KonselorApplication = {
  id: string
  user_id: string
  motivation: string
  experience: string | null
  credential_url: string | null
  specialization: string[] | null
  availability_note: string | null
  status: ApplicationStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export type KonselorProfile = {
  user_id: string
  specialization: string[] | null
  bio: string | null
  approach: string | null
  languages: string[] | null
  session_length: number
  is_accepting: boolean
  verified_at: string | null
  verified_by: string | null
  created_at: string
  updated_at: string
}

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'publish' | 'unpublish'
  | 'approve' | 'reject' | 'role_change' | 'settings_change' | 'login' | 'export'
  // Fase 2 (supabase/cms-superadmin.sql)
  | 'restore' | 'hide' | 'unhide' | 'purge' | 'ban' | 'unban'
  | 'reveal_identity' | 'break_glass_read' | 'broadcast' | 'bulk'

export type AuditLogEntry = {
  id: string
  actor_id: string | null
  actor_role: UserRole | null
  action: AuditAction
  entity: string
  entity_id: string | null
  detail: Record<string, unknown>
  // Audit v2 — snapshot sebelum/sesudah, alasan, dan asal permintaan.
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  reason: string | null
  ip: string | null
  user_agent: string | null
  created_at: string
  // Joins
  actor?: Profile
}

export type IdentityRevealLog = {
  id: string
  requested_by: string
  target_content_type: ContentType | null
  target_content_id: string | null
  revealed_user_id: string | null
  reason: string
  created_at: string
}

export type Profile = {
  id: string
  full_name: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  bio: string | null
  angkatan: string | null
  jurusan: string | null
  is_verified: boolean
  is_active: boolean
  is_online: boolean
  last_seen: string | null
  specialization: string[] | null
  anon_token: string
  created_at: string
  updated_at: string
  counselor_schedule?: any
  counselor_certificate?: string | null
  is_counselor_setup_completed?: boolean
}

export type ThreadCategory = {
  id: string
  name: string
  name_en: string | null
  slug: string
  icon: string
  color: string
  sort_order: number
}

/**
 * Kolom moderasi yang dibagikan semua tabel konten (Fase 2).
 * Lihat supabase/cms-superadmin.sql.
 */
export type ModerationFields = {
  moderation_status: ModerationStatus
  hidden_by: string | null
  hidden_reason: string | null
  hidden_at: string | null
  deleted_at: string | null
  deleted_by: string | null
  delete_reason: string | null
}

export type Thread = ModerationFields & {
  id: string
  author_id: string
  category_id: string | null
  title: string
  content: string
  is_anonymous: boolean
  is_pinned: boolean
  is_locked: boolean
  is_flagged: boolean
  view_count: number
  comment_count: number
  created_at: string
  updated_at: string
  // Joins
  author?: Profile
  category?: ThreadCategory
  reactions?: Reaction[]
  user_reaction?: Reaction | null
}

export type Comment = ModerationFields & {
  id: string
  thread_id: string
  author_id: string
  parent_id: string | null
  content: string
  is_anonymous: boolean
  is_flagged: boolean
  created_at: string
  updated_at: string
  // Joins
  author?: Profile
  replies?: Comment[]
}

export type Reaction = {
  id: string
  user_id: string
  content_type: ContentType
  content_id: string
  reaction: string
  created_at: string
}

export type ChatSession = {
  id: string
  member_id: string
  konselor_id: string | null
  status: SessionStatus
  topic: string | null
  is_anonymous: boolean
  member_rating: number | null
  member_review: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
  // Joins
  member?: Profile
  konselor?: Profile
  last_message?: Message
  unread_count?: number
}

export type Message = {
  id: string
  session_id: string
  sender_id: string
  content: string
  is_read: boolean
  is_flagged: boolean
  created_at: string
  // Joins
  sender?: Profile
}

export type KonselorAvailability = {
  id: string
  konselor_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  created_at: string
  // Joins
  konselor?: Profile
}

export type Booking = {
  id: string
  member_id: string
  konselor_id: string
  slot_id: string | null
  scheduled_at: string
  duration_min: number
  topic: string | null
  status: BookingStatus
  is_anonymous: boolean
  notes: string | null
  meeting_link: string | null
  session_id: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  // Joins
  member?: Profile
  konselor?: Profile
}

export type PrayerRequest = ModerationFields & {
  id: string
  author_id: string
  content: string
  category_id: string | null
  is_anonymous: boolean
  is_answered: boolean
  pray_count: number
  created_at: string
  updated_at: string
  // Joins
  author?: Profile
  category?: ThreadCategory
  has_supported?: boolean   // current user has prayed
  attachments?: Attachment[]
}

export type Article = ModerationFields & {
  id: string
  author_id: string
  category_id: string | null
  title: string
  slug: string
  excerpt: string | null
  content: string
  cover_url: string | null
  is_published: boolean
  read_count: number
  tags: string[] | null
  published_at: string | null
  created_at: string
  updated_at: string
  // Alur persetujuan (lihat supabase/cms-rbac.sql)
  status: PublicationStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  // Joins
  author?: Profile
  category?: ThreadCategory
  attachments?: Attachment[]
}

export type CellGroup = ModerationFields & {
  id: string
  name: string
  description: string | null
  icon: string
  leader_id: string | null
  invite_code: string
  is_active: boolean
  // Fase 4 (M6): grup bisa diarsipkan tanpa menghapus riwayat, dan
  // keanggotaan bisa dibatasi jumlah serta diwajibkan memakai kode undangan.
  is_archived: boolean
  invite_code_required: boolean
  max_members: number
  archived_at: string | null
  archived_by: string | null
  updated_at: string
  created_at: string
  // Joins
  leader?: Profile
  member_count?: number
  unread_count?: number
}

export type CellGroupMessage = ModerationFields & {
  id: string
  group_id: string
  sender_id: string
  content: string
  is_anonymous: boolean
  created_at: string
  // Joins
  sender?: Profile
}

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  meta: Record<string, unknown> | null
  created_at: string
}

export type ContentReport = {
  id: string
  reporter_id: string
  content_type: ContentType
  content_id: string
  reason: string
  detail: string | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  resolution: string | null
  created_at: string
  // Ditambahkan supabase/phase3-content-modules.sql
  action_taken: string | null
  notified_reporter_at: string | null
  /** 'normal' atau 'high' (kata kunci krisis). */
  severity: string
  auto_hidden: boolean
}

// supabase/phase3-content-modules.sql
export type ArticleRevision = {
  id: string
  article_id: string
  title: string
  content: string
  excerpt: string | null
  status: PublicationStatus | null
  edited_by: string | null
  edit_reason: string | null
  version: number
  created_at: string
}

export type BannedWord = {
  id: string
  word: string
  /** 'spam' | 'kasar' | 'krisis' */
  category: string
  is_active: boolean
  created_at: string
}

// ─────────────── FASE 4 (M7, M9, M10, M12, M13, M14) ───────────────

export type SessionNote = {
  id: string
  session_id: string
  konselor_id: string
  /** Nama kolom di database adalah `note` (sejak phase1-data-security.sql). */
  note: string
  created_at: string
  updated_at: string
}

export type BreakGlassRead = {
  id: string
  session_id: string
  actor_id: string
  reason: string
  message_count: number
  expires_at: string
  created_at: string
}

export type Broadcast = {
  id: string
  title: string
  body: string
  link: string | null
  audience: 'all' | 'role' | 'angkatan' | 'cell_group'
  audience_value: string | null
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduled_at: string | null
  sent_at: string | null
  recipient_count: number
  read_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type BroadcastTemplate = {
  id: string
  name: string
  title: string
  body: string
  link: string | null
  created_at: string
}

export type SitePage = {
  id: string
  slug: string
  title: string
  title_en: string | null
  content: string
  content_en: string | null
  status: 'draft' | 'published'
  sort_order: number
  show_in_footer: boolean
  created_at: string
  updated_at: string
}

export type SiteBanner = {
  id: string
  message: string
  message_en: string | null
  level: 'info' | 'warning' | 'critical'
  starts_at: string
  ends_at: string | null
  target_role: string | null
  dismissible: boolean
  is_active: boolean
  created_at: string
}

export type Resource = {
  id: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  url: string
  category: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export type DataRequest = {
  id: string
  user_id: string
  kind: 'export' | 'delete'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  note: string | null
  handled_by: string | null
  handled_at: string | null
  created_at: string
}

export type SchemaMigration = {
  version: string
  description: string | null
  applied_at: string
  applied_by: string | null
}

export type DailyVerse = {
  id: string
  verse_text: string
  verse_ref: string
  verse_text_en: string | null
  verse_ref_en: string | null
  display_date: string | null
  created_at: string
}

// ─────────────────────────────────────────────────────────────
// Tipe schema Supabase (Tables/Views/Functions/Enums).
// Definisi lengkapnya di ./supabase-database.ts — dipisah karena file ini
// fokus pada tipe domain. Di-export ulang di sini supaya impor lama
// (`import type { Database } from '@/types/database'`) tetap jalan.
// ─────────────────────────────────────────────────────────────
export type { Database } from './supabase-database'
