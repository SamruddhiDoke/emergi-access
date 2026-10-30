import crypto from 'node:crypto';

// Crockford base32 — no I, L, O, U to avoid transcription errors during manual entry.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Generates an opaque Emergency ID with 80 bits of entropy, e.g. EA-7KQ2-M9XD-4TPL-H3VB.
 * It carries no patient information and cannot be derived from any patient attribute.
 */
export function generateEmergencyId() {
  const bytes = crypto.randomBytes(10);
  let bits = 0n;
  for (const b of bytes) bits = (bits << 8n) | BigInt(b);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out = ALPHABET[Number(bits & 31n)] + out;
    bits >>= 5n;
  }
  return `EA-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

export const EMERGENCY_ID_PATTERN = /^EA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** Normalises scanned or typed input: accepts raw IDs or emergi-access:// URIs, tolerates case and spacing. */
export function normalizeEmergencyId(input) {
  if (typeof input !== 'string') return null;
  let value = input.trim().toUpperCase();
  const uri = value.match(/^EMERGI-ACCESS:\/\/(?:ID\/)?(.+)$/);
  if (uri) value = uri[1];
  value = value.replace(/\s+/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (!value.startsWith('EA-') && /^EA[0-9A-Z]{16}$/.test(value)) {
    value = `EA-${value.slice(2, 6)}-${value.slice(6, 10)}-${value.slice(10, 14)}-${value.slice(14, 18)}`;
  }
  return EMERGENCY_ID_PATTERN.test(value) ? value : null;
}
