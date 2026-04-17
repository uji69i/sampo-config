import { describe, it, expect } from 'vitest'
import { normalizeManualRule } from '../validators'

describe('normalizeManualRule', () => {
  describe('DOMAIN-SUFFIX', () => {
    it('normalizes valid domain', () => {
      expect(normalizeManualRule('DOMAIN-SUFFIX', 'example.com')).toEqual({ ok: true, value: 'example.com' })
      expect(normalizeManualRule('DOMAIN-SUFFIX', '  sub.example.com  ')).toEqual({
        ok: true,
        value: 'sub.example.com',
      })
      expect(normalizeManualRule('DOMAIN-SUFFIX', 'https://example.com/path')).toEqual({
        ok: true,
        value: 'example.com',
      })
    })
    it('strips *. prefix', () => {
      expect(normalizeManualRule('DOMAIN-SUFFIX', '*.example.com')).toEqual({ ok: true, value: 'example.com' })
    })
    it('rejects invalid domain', () => {
      const r = normalizeManualRule('DOMAIN-SUFFIX', 'single')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toContain('Invalid domain')
    })
  })

  describe('DOMAIN-KEYWORD', () => {
    it('normalizes keyword', () => {
      expect(normalizeManualRule('DOMAIN-KEYWORD', '  google  ')).toEqual({ ok: true, value: 'google' })
    })
    it('rejects empty keyword', () => {
      const r = normalizeManualRule('DOMAIN-KEYWORD', '   ')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toContain('empty')
    })
    it('rejects backslash in keyword', () => {
      const r = normalizeManualRule('DOMAIN-KEYWORD', 'foo\\bar')
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/\/|\\\\/)
    })
    it('strips path from URL-like input (slash removed)', () => {
      // stripSchemeAndPath + split by / leaves "foo" so no slash in final value
      expect(normalizeManualRule('DOMAIN-KEYWORD', 'https://foo/bar')).toEqual({ ok: true, value: 'foo' })
    })
  })

  describe('IP-CIDR', () => {
    it('accepts plain IPv4 and adds /32', () => {
      expect(normalizeManualRule('IP-CIDR', '192.168.1.1')).toEqual({ ok: true, value: '192.168.1.1/32' })
    })
    it('accepts valid CIDR', () => {
      expect(normalizeManualRule('IP-CIDR', '10.0.0.0/24')).toEqual({ ok: true, value: '10.0.0.0/24' })
    })
    it('rejects invalid IP', () => {
      const r = normalizeManualRule('IP-CIDR', '256.1.1.1')
      expect(r.ok).toBe(false)
    })
    it('rejects invalid mask', () => {
      const r = normalizeManualRule('IP-CIDR', '10.0.0.0/33')
      expect(r.ok).toBe(false)
    })
  })

  describe('IP-ASN', () => {
    it('normalizes ASN with AS prefix', () => {
      expect(normalizeManualRule('IP-ASN', 'AS12345')).toEqual({ ok: true, value: '12345' })
    })
    it('accepts numeric ASN', () => {
      expect(normalizeManualRule('IP-ASN', ' 12345 ')).toEqual({ ok: true, value: '12345' })
    })
    it('rejects non-numeric', () => {
      const r = normalizeManualRule('IP-ASN', 'ASN123')
      expect(r.ok).toBe(false)
    })
  })

  describe('PROCESS-NAME', () => {
    it('accepts valid process name', () => {
      expect(normalizeManualRule('PROCESS-NAME', 'chrome')).toEqual({ ok: true, value: 'chrome' })
    })
    it('rejects path separators', () => {
      const r = normalizeManualRule('PROCESS-NAME', 'C:\\foo\\bar')
      expect(r.ok).toBe(false)
    })
  })

  describe('PROCESS-PATH', () => {
    it('accepts Windows path', () => {
      expect(normalizeManualRule('PROCESS-PATH', 'C:\\Program Files\\app.exe')).toEqual({
        ok: true,
        value: 'C:\\Program Files\\app.exe',
      })
    })
    it('accepts Unix path', () => {
      expect(normalizeManualRule('PROCESS-PATH', '/usr/bin/app')).toEqual({
        ok: true,
        value: '/usr/bin/app',
      })
    })
    it('rejects relative path', () => {
      const r = normalizeManualRule('PROCESS-PATH', 'app.exe')
      expect(r.ok).toBe(false)
    })
  })

  describe('DOMAIN', () => {
    it('accepts full domain', () => {
      expect(normalizeManualRule('DOMAIN', 'example.com')).toEqual({ ok: true, value: 'example.com' })
    })
  })

  describe('default (other types)', () => {
    it('trims value', () => {
      expect(normalizeManualRule('GEOIP', '  RU  ')).toEqual({ ok: true, value: 'RU' })
    })
    it('returns empty string for whitespace-only input', () => {
      expect(normalizeManualRule('GEOIP', '   ')).toEqual({ ok: true, value: '' })
    })
    it('IP-CIDR6 falls through to trim-only', () => {
      expect(normalizeManualRule('IP-CIDR6', '  ::1/128  ')).toEqual({ ok: true, value: '::1/128' })
    })
  })
})

describe('normalizeManualRule — extra edge cases', () => {
  describe('DOMAIN-SUFFIX — boundary domains', () => {
    it('rejects single-label domain (no dot)', () => {
      const r = normalizeManualRule('DOMAIN-SUFFIX', 'localhost')
      expect(r.ok).toBe(false)
    })
    it('rejects domain with trailing dot (dot-stripping happens post-validation)', () => {
      // isValidDomain splits on '.' producing an empty last label → fails
      expect(normalizeManualRule('DOMAIN-SUFFIX', 'example.com.')).toMatchObject({ ok: false })
    })
    it('rejects domain label starting with hyphen', () => {
      const r = normalizeManualRule('DOMAIN-SUFFIX', '-bad.example.com')
      expect(r.ok).toBe(false)
    })
    it('rejects domain label ending with hyphen', () => {
      const r = normalizeManualRule('DOMAIN-SUFFIX', 'bad-.example.com')
      expect(r.ok).toBe(false)
    })
    it('rejects empty string', () => {
      expect(normalizeManualRule('DOMAIN-SUFFIX', '')).toMatchObject({ ok: false })
    })
  })

  describe('DOMAIN-KEYWORD — extra cases', () => {
    it('lowercases the keyword', () => {
      expect(normalizeManualRule('DOMAIN-KEYWORD', 'Google')).toMatchObject({ ok: true, value: 'google' })
    })
    it('strips spaces within keyword', () => {
      expect(normalizeManualRule('DOMAIN-KEYWORD', 'g o o g l e')).toMatchObject({ ok: true, value: 'google' })
    })
    it('strips path after slash — "foo/bar" becomes keyword "foo"', () => {
      // stripSchemeAndPath splits on '/' and takes the first segment
      expect(normalizeManualRule('DOMAIN-KEYWORD', 'foo/bar')).toMatchObject({ ok: true, value: 'foo' })
    })
  })

  describe('IP-CIDR — extra cases', () => {
    it('accepts /0 mask', () => {
      expect(normalizeManualRule('IP-CIDR', '0.0.0.0/0')).toEqual({ ok: true, value: '0.0.0.0/0' })
    })
    it('accepts /32 mask explicitly', () => {
      expect(normalizeManualRule('IP-CIDR', '192.168.1.1/32')).toEqual({ ok: true, value: '192.168.1.1/32' })
    })
    it('rejects IPv6 address', () => {
      const r = normalizeManualRule('IP-CIDR', '::1/128')
      expect(r.ok).toBe(false)
    })
    it('rejects octet > 255', () => {
      expect(normalizeManualRule('IP-CIDR', '300.0.0.1')).toMatchObject({ ok: false })
    })
    it('rejects empty string', () => {
      expect(normalizeManualRule('IP-CIDR', '')).toMatchObject({ ok: false })
    })
  })

  describe('IP-ASN — extra cases', () => {
    it('accepts AS0', () => {
      expect(normalizeManualRule('IP-ASN', 'AS0')).toEqual({ ok: true, value: '0' })
    })
    it('accepts large ASN', () => {
      expect(normalizeManualRule('IP-ASN', '4294967295')).toEqual({ ok: true, value: '4294967295' })
    })
    it('rejects decimal ASN', () => {
      const r = normalizeManualRule('IP-ASN', '12.34')
      expect(r.ok).toBe(false)
    })
    it('rejects empty string', () => {
      expect(normalizeManualRule('IP-ASN', '')).toMatchObject({ ok: false })
    })
  })

  describe('PROCESS-NAME — extra cases', () => {
    it('strips surrounding double quotes', () => {
      expect(normalizeManualRule('PROCESS-NAME', '"chrome"')).toEqual({ ok: true, value: 'chrome' })
    })
    it('rejects colon in name', () => {
      const r = normalizeManualRule('PROCESS-NAME', 'app:1')
      expect(r.ok).toBe(false)
    })
    it('rejects empty string', () => {
      expect(normalizeManualRule('PROCESS-NAME', '')).toMatchObject({ ok: false })
    })
  })

  describe('PROCESS-PATH — extra cases', () => {
    it('accepts UNC path', () => {
      expect(normalizeManualRule('PROCESS-PATH', '\\\\server\\share\\app.exe')).toMatchObject({ ok: true })
    })
    it('strips surrounding double quotes', () => {
      expect(normalizeManualRule('PROCESS-PATH', '"/usr/bin/app"')).toEqual({ ok: true, value: '/usr/bin/app' })
    })
    it('rejects empty string', () => {
      expect(normalizeManualRule('PROCESS-PATH', '')).toMatchObject({ ok: false })
    })
    it('rejects relative path without leading separator', () => {
      const r = normalizeManualRule('PROCESS-PATH', 'relative/path/app')
      expect(r.ok).toBe(false)
    })
  })
})
