// Tipe untuk Supabase client.
//
// CATATAN PENTING soal `Relationships`:
// @supabase/postgrest-js v2.99 mewajibkan setiap entri Tables memiliki kunci
// `Relationships`. Tanpa itu, tipe schema gagal memenuhi constraint
// GenericSchema dan SELURUH builder turun ke `never` — gejalanya adalah
// error "Argument of type ... is not assignable to parameter of type 'never'"
// di setiap .insert()/.update()/.rpc().
//
// Karena itu setiap tabel di bawah wajib punya `Relationships`, walaupun
// isinya array kosong. Foreign key yang benar-benar di-embed oleh kode
// (mis. `author:profiles(...)`) didaftarkan agar tipe hasil select tetap akurat.

import type {
  Profile, Thread, Comment, Reaction, ChatSession, Message, Booking,
  KonselorAvailability, PrayerRequest, Article, CellGroup, CellGroupMessage,
  Notification, ContentReport, DailyVerse, ThreadCategory,
  Attachment, AttachmentKind, ContentKind, AuditLogEntry, IdentityRevealLog,
  HotlineContact, KonselorApplication, KonselorProfile, LegalDocument,
  SiteSetting, UserRole, SessionStatus, BookingStatus, ReportStatus,
  PublicationStatus, ApplicationStatus, ContentType, NotificationType,
  ModerationFields, ModerationStatus, AuditAction,
} from './database'

/**
 * Nama kolom moderasi. Dipakai untuk membuang kolom-kolom ini dari tipe
 * `Insert` lalu menambahkannya kembali sebagai OPSIONAL (Partial) — kolom
 * moderasi selalu punya DEFAULT di database dan hanya diisi oleh CMS.
 */
type ModerationKeys = keyof ModerationFields

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

const rel = (
  foreignKeyName: string,
  columns: string[],
  referencedRelation: string,
  referencedColumns: string[] = ['id'],
  isOneToOne = false
): Rel => ({ foreignKeyName, columns, referencedRelation, referencedColumns, isOneToOne })

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile>
        Update: Partial<Profile>
        Relationships: []
      }
      threads: {
        Row: Thread
        Insert: Omit<Thread, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'comment_count' | ModerationKeys> & Partial<ModerationFields>
        Update: Partial<Thread>
        Relationships: [
          Rel & { foreignKeyName: 'threads_author_id_fkey'; columns: ['author_id']; referencedRelation: 'profiles' },
          Rel & { foreignKeyName: 'threads_category_id_fkey'; columns: ['category_id']; referencedRelation: 'thread_categories' },
        ]
      }
      comments: {
        Row: Comment
        Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at' | ModerationKeys> & Partial<ModerationFields>
        Update: Partial<Comment>
        Relationships: [
          Rel & { foreignKeyName: 'comments_author_id_fkey'; columns: ['author_id']; referencedRelation: 'profiles' },
          Rel & { foreignKeyName: 'comments_thread_id_fkey'; columns: ['thread_id']; referencedRelation: 'threads' },
        ]
      }
      reactions: {
        Row: Reaction
        Insert: Omit<Reaction, 'id' | 'created_at'>
        Update: Partial<Reaction>
        Relationships: [
          Rel & { foreignKeyName: 'reactions_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles' },
        ]
      }
      chat_sessions: {
        Row: ChatSession
        Insert: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<ChatSession>
        Relationships: [
          Rel & { foreignKeyName: 'chat_sessions_member_id_fkey'; columns: ['member_id']; referencedRelation: 'profiles' },
          Rel & { foreignKeyName: 'chat_sessions_konselor_id_fkey'; columns: ['konselor_id']; referencedRelation: 'profiles' },
        ]
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Message>
        Relationships: [
          Rel & { foreignKeyName: 'messages_session_id_fkey'; columns: ['session_id']; referencedRelation: 'chat_sessions' },
          Rel & { foreignKeyName: 'messages_sender_id_fkey'; columns: ['sender_id']; referencedRelation: 'profiles' },
        ]
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Booking>
        Relationships: [
          Rel & { foreignKeyName: 'bookings_member_id_fkey'; columns: ['member_id']; referencedRelation: 'profiles' },
          Rel & { foreignKeyName: 'bookings_konselor_id_fkey'; columns: ['konselor_id']; referencedRelation: 'profiles' },
        ]
      }
      konselor_availability: {
        Row: KonselorAvailability
        Insert: Omit<KonselorAvailability, 'id' | 'created_at'>
        Update: Partial<KonselorAvailability>
        Relationships: [
          Rel & { foreignKeyName: 'konselor_availability_konselor_id_fkey'; columns: ['konselor_id']; referencedRelation: 'profiles' },
        ]
      }
      prayer_requests: {
        Row: PrayerRequest
        Insert: Omit<PrayerRequest, 'id' | 'created_at' | 'updated_at' | 'pray_count' | ModerationKeys> & Partial<ModerationFields>
        Update: Partial<PrayerRequest>
        Relationships: [
          Rel & { foreignKeyName: 'prayer_requests_author_id_fkey'; columns: ['author_id']; referencedRelation: 'profiles' },
          Rel & { foreignKeyName: 'prayer_requests_category_id_fkey'; columns: ['category_id']; referencedRelation: 'thread_categories' },
        ]
      }
      prayer_supports: {
        Row: { id: string; request_id: string; user_id: string; created_at: string }
        Insert: { request_id: string; user_id: string }
        Update: never
        Relationships: [
          Rel & { foreignKeyName: 'prayer_supports_request_id_fkey'; columns: ['request_id']; referencedRelation: 'prayer_requests' },
          Rel & { foreignKeyName: 'prayer_supports_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles' },
        ]
      }
      articles: {
        Row: Article
        Insert: Omit<Article, 'id' | 'created_at' | 'read_count' | 'status' | 'reviewed_by' | 'reviewed_at' | 'review_notes' | 'tags' | 'excerpt' | 'cover_url' | 'category_id' | 'published_at' | 'updated_at' | ModerationKeys> & {
          status?: PublicationStatus
          tags?: string[] | null
          excerpt?: string | null
          cover_url?: string | null
          category_id?: string | null
          published_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          updated_at?: string
          id?: string
        } & Partial<ModerationFields>
        Update: Partial<Article>
        Relationships: [
          Rel & { foreignKeyName: 'articles_author_id_fkey'; columns: ['author_id']; referencedRelation: 'profiles' },
          Rel & { foreignKeyName: 'articles_category_id_fkey'; columns: ['category_id']; referencedRelation: 'thread_categories' },
        ]
      }
      cell_groups: {
        Row: CellGroup
        Insert: Omit<CellGroup, 'id' | 'created_at' | ModerationKeys> & Partial<ModerationFields>
        Update: Partial<CellGroup>
        Relationships: [
          Rel & { foreignKeyName: 'cell_groups_leader_id_fkey'; columns: ['leader_id']; referencedRelation: 'profiles'; isOneToOne: true },
        ]
      }
      cell_group_members: {
        Row: { id: string; group_id: string; user_id: string; is_leader: boolean; joined_at: string }
        Insert: { group_id: string; user_id: string; is_leader?: boolean }
        Update: never
        Relationships: [
          Rel & { foreignKeyName: 'cell_group_members_group_id_fkey'; columns: ['group_id']; referencedRelation: 'cell_groups' },
          Rel & { foreignKeyName: 'cell_group_members_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles' },
        ]
      }
      cell_group_messages: {
        Row: CellGroupMessage
        Insert: Omit<CellGroupMessage, 'id' | 'created_at' | ModerationKeys> & Partial<ModerationFields>
        Update: Partial<CellGroupMessage>
        Relationships: [
          Rel & { foreignKeyName: 'cell_group_messages_group_id_fkey'; columns: ['group_id']; referencedRelation: 'cell_groups' },
          Rel & { foreignKeyName: 'cell_group_messages_sender_id_fkey'; columns: ['sender_id']; referencedRelation: 'profiles' },
        ]
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'meta' | 'body' | 'link'> & {
          is_read?: boolean
          meta?: Record<string, unknown> | null
          body?: string | null
          link?: string | null
          id?: string
        }
        Update: Partial<Notification>
        Relationships: [
          Rel & { foreignKeyName: 'notifications_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles' },
        ]
      }
      content_reports: {
        Row: ContentReport
        Insert: Omit<ContentReport, 'id' | 'created_at' | 'reviewed_by' | 'reviewed_at' | 'resolution'>
        Update: Partial<ContentReport>
        Relationships: [
          Rel & { foreignKeyName: 'content_reports_reporter_id_fkey'; columns: ['reporter_id']; referencedRelation: 'profiles' },
        ]
      }
      daily_verses: {
        Row: DailyVerse
        Insert: Omit<DailyVerse, 'id' | 'created_at'>
        Update: Partial<DailyVerse>
        Relationships: []
      }
      thread_categories: {
        Row: ThreadCategory
        Insert: Omit<ThreadCategory, 'id'>
        Update: Partial<ThreadCategory>
        Relationships: []
      }
      // ── CMS + RBAC (lihat supabase/cms-rbac.sql) ──
      site_settings: {
        Row: SiteSetting
        Insert: { key: string; value?: Record<string, unknown>; description?: string | null; updated_by?: string | null; updated_at?: string }
        Update: Partial<SiteSetting>
        Relationships: [
          Rel & { foreignKeyName: 'site_settings_updated_by_fkey'; columns: ['updated_by']; referencedRelation: 'profiles'; isOneToOne: true },
        ]
      }
      hotline_contacts: {
        Row: HotlineContact
        Insert: { id?: string; name: string; description?: string | null; number: string; display?: string | null; type?: string; note?: string | null; sort_order?: number; is_active?: boolean; updated_at?: string }
        Update: Partial<HotlineContact>
        Relationships: []
      }
      legal_documents: {
        Row: LegalDocument
        Insert: { slug: string; title: string; summary?: string | null; content: string; version?: number; effective_date?: string | null; is_published?: boolean; updated_by?: string | null; updated_at?: string }
        Update: Partial<LegalDocument>
        Relationships: [
          Rel & { foreignKeyName: 'legal_documents_updated_by_fkey'; columns: ['updated_by']; referencedRelation: 'profiles'; isOneToOne: true },
        ]
      }
      attachments: {
        Row: Attachment
        Insert: { id?: string; owner_id: string; content_type: ContentKind; content_id?: string | null; kind: AttachmentKind; url: string; title?: string | null; mime_type?: string | null; size_bytes?: number | null; sort_order?: number }
        Update: Partial<Attachment>
        Relationships: [
          Rel & { foreignKeyName: 'attachments_owner_id_fkey'; columns: ['owner_id']; referencedRelation: 'profiles' },
        ]
      }
      konselor_applications: {
        Row: KonselorApplication
        Insert: { id?: string; user_id: string; motivation: string; experience?: string | null; credential_url?: string | null; specialization?: string[] | null; availability_note?: string | null; status?: ApplicationStatus; reviewed_by?: string | null; reviewed_at?: string | null; review_notes?: string | null }
        Update: Partial<KonselorApplication>
        Relationships: [
          Rel & { foreignKeyName: 'konselor_applications_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles' },
          Rel & { foreignKeyName: 'konselor_applications_reviewed_by_fkey'; columns: ['reviewed_by']; referencedRelation: 'profiles' },
        ]
      }
      konselor_profiles: {
        Row: KonselorProfile
        Insert: KonselorProfile
        Update: Partial<KonselorProfile>
        Relationships: [
          Rel & { foreignKeyName: 'konselor_profiles_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; isOneToOne: true },
        ]
      }
      audit_log: {
        Row: AuditLogEntry
        Insert: Omit<AuditLogEntry, 'id' | 'created_at'>
        Update: never
        Relationships: [
          Rel & { foreignKeyName: 'audit_log_actor_id_fkey'; columns: ['actor_id']; referencedRelation: 'profiles' },
        ]
      }
      identity_reveal_log: {
        Row: IdentityRevealLog
        Insert: Omit<IdentityRevealLog, 'id' | 'created_at' | 'target_content_type' | 'target_content_id' | 'revealed_user_id'> & {
          target_content_type?: ContentType | null
          target_content_id?: string | null
          revealed_user_id?: string | null
          id?: string
        }
        Update: never
        Relationships: [
          Rel & { foreignKeyName: 'identity_reveal_log_requested_by_fkey'; columns: ['requested_by']; referencedRelation: 'profiles' },
          Rel & { foreignKeyName: 'identity_reveal_log_revealed_user_id_fkey'; columns: ['revealed_user_id']; referencedRelation: 'profiles' },
        ]
      }
    }
    // ─── VIEW PUBLIK (supabase/phase1-data-security.sql) ───
    //
    // View ini menyembunyikan identitas penulis anonim: author_id NULL dan
    // author_name/avatar NULL untuk konten anonim, digantikan `anon_label`
    // (pseudonim per-konten). Halaman publik membaca lewat view ini supaya
    // anon_token tidak pernah sampai ke browser.
    Views: {
      threads_public: {
        Row: {
          id: string
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
          author_id: string | null
          anon_label: string | null
          author_name: string | null
          author_avatar: string | null
          author_role: UserRole | null
        }
        Relationships: []
      }
      comments_public: {
        Row: {
          id: string
          thread_id: string
          parent_id: string | null
          content: string
          is_anonymous: boolean
          is_flagged: boolean
          created_at: string
          author_id: string | null
          anon_label: string | null
          author_name: string | null
          author_avatar: string | null
          author_role: UserRole | null
        }
        Relationships: []
      }
      prayers_public: {
        Row: {
          id: string
          content: string
          category_id: string | null
          is_anonymous: boolean
          is_answered: boolean
          pray_count: number
          created_at: string
          updated_at: string
          author_id: string | null
          anon_label: string | null
          author_name: string | null
          author_avatar: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          id: string
          full_name: string
          display_name: string | null
          avatar_url: string | null
          role: UserRole
          bio: string | null
          angkatan: string | null
          jurusan: string | null
          specialization: string[] | null
          is_verified: boolean
          is_online: boolean
          last_seen: string | null
          created_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      get_display_name: {
        Args: { p_user_id: string; p_is_anonymous: boolean }
        Returns: string
      }
      current_user_role: { Args: Record<never, never>; Returns: UserRole }
      is_admin_or_above: { Args: Record<never, never>; Returns: boolean }
      is_konselor_or_above: { Args: Record<never, never>; Returns: boolean }
      // Helper RBAC & audit dari supabase/cms-rbac.sql.
      // Nama fungsi peran: `current_user_role` — BUKAN `current_role`, karena
      // CURRENT_ROLE adalah keyword bawaan SQL.
      has_min_role: { Args: { p_role: UserRole }; Returns: boolean }
      is_moderator_or_above: { Args: Record<never, never>; Returns: boolean }
      is_super_admin: { Args: Record<never, never>; Returns: boolean }
      role_rank: { Args: { p_role: UserRole }; Returns: number }
      log_audit: {
        Args: {
          p_action: AuditLogEntry['action']
          p_entity: string
          p_entity_id?: string | null
          p_detail?: Record<string, unknown>
        }
        Returns: undefined
      }
      /**
       * Audit v2 — snapshot before/after + alasan + asal permintaan.
       * Dipanggil oleh `cmsAction`. Lihat supabase/cms-superadmin.sql seksi 3.
       */
      log_audit_v2: {
        Args: {
          p_action: AuditAction
          p_entity: string
          p_entity_id?: string | null
          p_before?: Record<string, unknown> | null
          p_after?: Record<string, unknown> | null
          p_reason?: string | null
          p_ip?: string | null
          p_ua?: string | null
        }
        Returns: string
      }
      increment_thread_views: { Args: { thread_id: string }; Returns: undefined }
      // Pembukaan identitas penulis anonim. Menulis identity_reveal_log
      // LEBIH DULU, lalu mengembalikan identitasnya. Lihat
      // supabase/phase1-data-security.sql seksi 7.
      reveal_identity: {
        Args: {
          p_content_type: ContentType
          p_content_id: string
          p_reason: string
        }
        Returns: {
          user_id: string
          full_name: string
          angkatan: string | null
          jurusan: string | null
        }[]
      }
      // Notifikasi lintas pengguna ditolak policy notif_insert (user_id =
      // auth.uid()); dikirim lewat RPC SECURITY DEFINER.
      notify_user: {
        Args: {
          p_user_id: string
          p_type: NotificationType
          p_title: string
          p_body?: string | null
          p_link?: string | null
          p_meta?: Record<string, unknown> | null
        }
        Returns: string
      }
      // Anggota biasa memberi tahu admin (artikel baru, pengajuan konselor).
      // Tujuan terkunci ke akun admin/super_admin saja.
      notify_admins: {
        Args: {
          p_type: NotificationType
          p_title: string
          p_body?: string | null
          p_link?: string | null
        }
        Returns: number
      }
    }
    Enums: {
      user_role: UserRole
      session_status: SessionStatus
      booking_status: BookingStatus
      report_status: ReportStatus
      publication_status: PublicationStatus
      application_status: ApplicationStatus
      attachment_kind: AttachmentKind
      content_kind: ContentKind
    }
  }
}
