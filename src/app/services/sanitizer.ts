/**
 * Terminus Input Sanitizer & XSS Defense Utility
 * Ensures all user input across forms, URL queries, and payloads is stripped of harmful scripts.
 */

export function sanitizeText(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Strip control characters
  str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, '');
  // Strip script and malicious HTML tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  str = str.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  str = str.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  str = str.replace(/on\w+\s*=/gi, ''); // remove event handlers like onclick=
  str = str.replace(/javascript\s*:/gi, '');
  return str;
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function sanitizeEmail(val: unknown): string {
  if (!val) return '';
  const email = String(val).trim().toLowerCase();
  if (email.length > 254) return '';
  return EMAIL_REGEX.test(email) ? email : '';
}

export function sanitizeUrl(val: unknown): string {
  if (!val) return '';
  const url = String(val).trim();
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function sanitizeNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  const parsed = Number(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}
