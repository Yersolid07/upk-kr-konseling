// src/store/useAppStore.ts
import { create } from 'zustand'
import type { Profile } from '@/types/database'

interface AppState {
  // Auth
  profile: Profile | null
  setProfile: (profile: Profile | null) => void

  // Anonymous mode
  isAnonymous: boolean
  toggleAnonymous: () => void
  setAnonymous: (v: boolean) => void

  // Language
  lang: 'id' | 'en'
  setLang: (lang: 'id' | 'en') => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  toggleSidebar: () => void

  // SOS Modal
  sosOpen: boolean
  setSosOpen: (v: boolean) => void

  // Unread counts
  unreadMessages: number
  unreadNotifications: number
  setUnreadMessages: (n: number) => void
  setUnreadNotifications: (n: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),

  isAnonymous: true,
  toggleAnonymous: () => set((s) => ({ isAnonymous: !s.isAnonymous })),
  setAnonymous: (v) => set({ isAnonymous: v }),

  lang: 'id',
  setLang: (lang) => set({ lang }),

  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  sosOpen: false,
  setSosOpen: (v) => set({ sosOpen: v }),

  unreadMessages: 0,
  unreadNotifications: 0,
  setUnreadMessages: (n) => set({ unreadMessages: n }),
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
}))
