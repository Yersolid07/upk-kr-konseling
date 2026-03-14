// src/components/layout/Topbar.tsx
'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { Notification } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface TopbarProps {
  title: string
  notifications: Notification[]
  unreadCount: number
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}

export function Topbar({ title, notifications, unreadCount, onMarkAllRead, onMarkRead }: TopbarProps) {
  const { isAnonymous, toggleAnonymous, toggleSidebar, setSosOpen } = useAppStore()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <>
      <header className="topbar">
        {/* Hamburger (mobile) */}
        <button
          onClick={toggleSidebar}
          style={{
            display: 'none', width: 36, height: 36,
            border: 'none', background: 'var(--cream)',
            borderRadius: 8, cursor: 'pointer', fontSize: 18,
            alignItems: 'center', justifyContent: 'center'
          }}
          className="hamburger"
        >☰</button>

        <h1 className="topbar-title">{title}</h1>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--cream)', border: '1.5px solid var(--cream-dark)',
          borderRadius: 10, padding: '8px 14px', width: 240
        }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <input
            placeholder="Cari topik, konselor..."
            style={{
              border: 'none', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text)',
              outline: 'none', width: '100%'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Anon Toggle */}
          <div
            className={`anon-toggle ${isAnonymous ? 'on' : ''}`}
            onClick={toggleAnonymous}
          >
            <div className="toggle-pill" />
            <span>Anonim</span>
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-icon"
              onClick={() => setNotifOpen(!notifOpen)}
              style={{ position: 'relative' }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 8, height: 8, background: 'var(--terra)',
                  borderRadius: '50%', border: '1.5px solid var(--white)'
                }} />
              )}
            </button>

            {/* Notif Panel */}
            {notifOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 149 }}
                  onClick={() => setNotifOpen(false)}
                />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  width: 320, background: 'var(--white)',
                  borderRadius: 16, boxShadow: 'var(--shadow-md)',
                  border: '1px solid rgba(124,92,62,0.08)',
                  zIndex: 150, overflow: 'hidden', animation: 'fadeUp 0.2s ease'
                }}>
                  <div style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--cream-dark)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 15, fontWeight: 600, color: 'var(--brown-dark)' }}>
                      Notifikasi {unreadCount > 0 && `(${unreadCount})`}
                    </span>
                    {unreadCount > 0 && (
                      <button onClick={onMarkAllRead} style={{
                        background: 'none', border: 'none', color: 'var(--terra)',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)'
                      }}>
                        Tandai semua
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                        Tidak ada notifikasi
                      </div>
                    ) : notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { onMarkRead(n.id); setNotifOpen(false) }}
                        style={{
                          display: 'flex', gap: 10, padding: '12px 20px',
                          borderBottom: '1px solid var(--cream)',
                          cursor: 'pointer',
                          background: n.is_read ? 'transparent' : 'rgba(196,137,90,0.04)',
                          transition: 'background 0.2s'
                        }}
                      >
                        {!n.is_read && (
                          <div style={{
                            width: 8, height: 8, background: 'var(--terra)',
                            borderRadius: '50%', marginTop: 6, flexShrink: 0
                          }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{n.title}</div>
                          {n.body && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.body}</div>}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: idLocale })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SOS */}
          <button
            className="btn-icon"
            onClick={() => setSosOpen(true)}
            title="Bantuan Darurat"
            style={{ fontSize: 18 }}
          >
            🆘
          </button>
        </div>
      </header>
    </>
  )
}
