// test/rbac.test.ts
// Uji tabel kapabilitas & peringkat peran.
//
// Dijalankan: node --experimental-strip-types --test test/
//
// Kenapa ini penting: rbac.ts adalah satu-satunya sumber kebenaran otorisasi
// di sisi aplikasi. Satu entri salah di ROLE_CAPABILITIES berarti peran yang
// tidak seharusnya bisa menghapus konten orang lain bisa melakukannya — dan
// itu tidak akan tertangkap oleh build.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  ROLE_RANK,
  ROLE_CAPABILITIES,
  can,
  hasMinRole,
  isAdminOrAbove,
  isModeratorOrAbove,
  isKonselorOrAbove,
  isSuperAdmin,
  requireRole,
  requireCapability,
  AuthorizationError,
  type Capability,
} from '../src/lib/rbac.ts'

const ALL_ROLES = ['super_admin', 'admin', 'moderator', 'konselor', 'member'] as const

describe('peringkat peran', () => {
  test('urutan peringkat naik sesuai hierarki', () => {
    assert.ok(ROLE_RANK.super_admin > ROLE_RANK.admin)
    assert.ok(ROLE_RANK.admin > ROLE_RANK.moderator)
    assert.ok(ROLE_RANK.moderator > ROLE_RANK.konselor)
    assert.ok(ROLE_RANK.konselor > ROLE_RANK.member)
  })

  test('hasMinRole menolak peran di bawah ambang', () => {
    assert.equal(hasMinRole('member', 'admin'), false)
    assert.equal(hasMinRole('konselor', 'admin'), false)
    assert.equal(hasMinRole('admin', 'admin'), true)
    assert.equal(hasMinRole('super_admin', 'member'), true)
  })

  test('hasMinRole menolak peran kosong', () => {
    assert.equal(hasMinRole(null, 'member'), false)
    assert.equal(hasMinRole(undefined, 'member'), false)
  })

  test('predikat peran konsisten dengan hasMinRole', () => {
    for (const r of ALL_ROLES) {
      assert.equal(isSuperAdmin(r), r === 'super_admin', `isSuperAdmin(${r})`)
      assert.equal(isAdminOrAbove(r), hasMinRole(r, 'admin'), `isAdminOrAbove(${r})`)
      assert.equal(isModeratorOrAbove(r), hasMinRole(r, 'moderator'), `isModeratorOrAbove(${r})`)
      assert.equal(isKonselorOrAbove(r), hasMinRole(r, 'konselor'), `isKonselorOrAbove(${r})`)
    }
  })
})

describe('kapabilitas berbahaya', () => {
  // Setiap entri di bawah ini adalah tindakan yang tidak bisa dibatalkan atau
  // membuka data privat. Peran yang salah di sini adalah insiden nyata.
  const HANYA_SUPER: Capability[] = [
    'purgeContent',
    'manageSettings',
    'manageAdmins',
    'revealIdentity',
    'breakGlassRead',
    'exportData',
    'manageSystem',
  ]

  for (const cap of HANYA_SUPER) {
    test(`${cap} hanya super_admin`, () => {
      assert.deepEqual(
        [...ROLE_CAPABILITIES[cap]].sort(),
        ['super_admin'],
        `${cap} harus hanya untuk super_admin`
      )
    })
  }

  test('hapus permanen TIDAK diberikan ke admin atau moderator', () => {
    assert.equal(can('admin', 'purgeContent'), false)
    assert.equal(can('moderator', 'purgeContent'), false)
  })

  test('break-glass TIDAK diberikan ke admin', () => {
    assert.equal(can('admin', 'breakGlassRead'), false)
    assert.equal(can('konselor', 'breakGlassRead'), false)
  })

  test('anggota biasa tidak punya kapabilitas administratif apa pun', () => {
    const adminish: Capability[] = [
      'manageSettings', 'manageAdmins', 'manageUsers', 'banUsers',
      'approveArticles', 'moderateContent', 'softDeleteContent',
      'restoreContent', 'purgeContent', 'manageCategories', 'manageReports',
      'manageKonselorProfiles', 'broadcast', 'manageMedia', 'manageSiteContent',
      'manageVerses', 'exportData', 'managePrivacy', 'manageSystem',
      'viewAuditLog', 'revealIdentity', 'breakGlassRead', 'manageKonseling',
    ]
    for (const cap of adminish) {
      assert.equal(can('member', cap), false, `member tidak boleh ${cap}`)
    }
  })

  test('konselor boleh mengelola grup dan booking, bukan moderasi', () => {
    assert.equal(can('konselor', 'manageCellGroups'), true)
    assert.equal(can('konselor', 'manageBookings'), true)
    assert.equal(can('konselor', 'moderateContent'), false)
    assert.equal(can('konselor', 'manageKonseling'), false)
  })

  test('moderator boleh moderasi, tidak boleh pengaturan situs', () => {
    assert.equal(can('moderator', 'moderateContent'), true)
    assert.equal(can('moderator', 'manageReports'), true)
    assert.equal(can('moderator', 'manageSettings'), false)
    assert.equal(can('moderator', 'broadcast'), false)
  })
})

describe('setiap kapabilitas', () => {
  test('tidak ada daftar peran yang kosong', () => {
    for (const [cap, roles] of Object.entries(ROLE_CAPABILITIES)) {
      assert.ok(roles.length > 0, `${cap} tidak punya peran`)
    }
  })

  test('semua peran yang disebut valid', () => {
    const valid = new Set(ALL_ROLES)
    for (const [cap, roles] of Object.entries(ROLE_CAPABILITIES)) {
      for (const r of roles) {
        assert.ok(valid.has(r as (typeof ALL_ROLES)[number]), `${cap} menyebut peran asing: ${r}`)
      }
    }
  })

  test('can() konsisten dengan ROLE_CAPABILITIES untuk semua kombinasi', () => {
    for (const cap of Object.keys(ROLE_CAPABILITIES) as Capability[]) {
      for (const role of ALL_ROLES) {
        assert.equal(
          can(role, cap),
          (ROLE_CAPABILITIES[cap] as readonly string[]).includes(role),
          `can(${role}, ${cap})`
        )
      }
    }
  })

  test('can() menolak peran kosong', () => {
    assert.equal(can(null, 'moderateContent'), false)
    assert.equal(can(undefined, 'manageCellGroups'), false)
  })
})

describe('guard yang melempar', () => {
  test('requireRole melempar AuthorizationError saat kurang', () => {
    assert.throws(() => requireRole('member', 'admin'), AuthorizationError)
    assert.doesNotThrow(() => requireRole('admin', 'admin'))
  })

  test('requireCapability melempar saat tidak punya kapabilitas', () => {
    assert.throws(() => requireCapability('moderator', 'purgeContent'), AuthorizationError)
    assert.doesNotThrow(() => requireCapability('super_admin', 'purgeContent'))
  })
})
