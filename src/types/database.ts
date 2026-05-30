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

export interface Profile {
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

export interface ThreadCategory {
  id: string
  name: string
  name_en: string | null
  slug: string
  icon: string
  color: string
  sort_order: number
}

export interface Thread {
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

export interface Comment {
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

export interface Reaction {
  id: string
  user_id: string
  content_type: ContentType
  content_id: string
  reaction: string
  created_at: string
}

export interface ChatSession {
  id: string
  member_id: string
  konselor_id: string | null
  status: SessionStatus
  topic: string | null
  is_anonymous: boolean
  member_rating: number | null
  member_review: string | null
  konselor_notes: string | null
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

export interface Message {
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

export interface KonselorAvailability {
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

export interface Booking {
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

export interface PrayerRequest {
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
}

export interface Article {
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
  // Joins
  author?: Profile
  category?: ThreadCategory
}

export interface CellGroup {
  id: string
  name: string
  description: string | null
  icon: string
  leader_id: string | null
  invite_code: string
  is_active: boolean
  created_at: string
  // Joins
  leader?: Profile
  member_count?: number
  unread_count?: number
}

export interface CellGroupMessage {
  id: string
  group_id: string
  sender_id: string
  content: string
  is_anonymous: boolean
  created_at: string
  // Joins
  sender?: Profile
}

export interface Notification {
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

export interface ContentReport {
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
}

export interface DailyVerse {
  id: string
  verse_text: string
  verse_ref: string
  verse_text_en: string | null
  verse_ref_en: string | null
  display_date: string | null
  created_at: string
}

// Supabase Database type (for createClient generic)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      threads: { Row: Thread; Insert: Omit<Thread, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'comment_count'>; Update: Partial<Thread> }
      comments: { Row: Comment; Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Comment> }
      reactions: { Row: Reaction; Insert: Omit<Reaction, 'id' | 'created_at'>; Update: Partial<Reaction> }
      chat_sessions: { Row: ChatSession; Insert: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ChatSession> }
      messages: { Row: Message; Insert: Omit<Message, 'id' | 'created_at'>; Update: Partial<Message> }
      bookings: { Row: Booking; Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Booking> }
      konselor_availability: { Row: KonselorAvailability; Insert: Omit<KonselorAvailability, 'id' | 'created_at'>; Update: Partial<KonselorAvailability> }
      prayer_requests: { Row: PrayerRequest; Insert: Omit<PrayerRequest, 'id' | 'created_at' | 'updated_at' | 'pray_count'>; Update: Partial<PrayerRequest> }
      prayer_supports: { Row: { id: string; request_id: string; user_id: string; created_at: string }; Insert: { request_id: string; user_id: string }; Update: never }
      articles: { Row: Article; Insert: Omit<Article, 'id' | 'created_at' | 'read_count'>; Update: Partial<Article> }
      cell_groups: { Row: CellGroup; Insert: Omit<CellGroup, 'id' | 'created_at'>; Update: Partial<CellGroup> }
      cell_group_members: { Row: { id: string; group_id: string; user_id: string; is_leader: boolean; joined_at: string }; Insert: { group_id: string; user_id: string; is_leader?: boolean }; Update: never }
      cell_group_messages: { Row: CellGroupMessage; Insert: Omit<CellGroupMessage, 'id' | 'created_at'>; Update: never }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Notification> }
      content_reports: { Row: ContentReport; Insert: Omit<ContentReport, 'id' | 'created_at' | 'reviewed_by' | 'reviewed_at' | 'resolution'>; Update: Partial<ContentReport> }
      daily_verses: { Row: DailyVerse; Insert: Omit<DailyVerse, 'id' | 'created_at'>; Update: Partial<DailyVerse> }
      thread_categories: { Row: ThreadCategory; Insert: Omit<ThreadCategory, 'id'>; Update: Partial<ThreadCategory> }
    }
    Functions: {
      get_display_name: {
        Args: { p_user_id: string; p_is_anonymous: boolean }
        Returns: string
      }
      current_user_role: { Args: Record<never, never>; Returns: UserRole }
      is_admin_or_above: { Args: Record<never, never>; Returns: boolean }
      is_konselor_or_above: { Args: Record<never, never>; Returns: boolean }
    }
  }
}
