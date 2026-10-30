/**
 * Thin Fetch API client. Authentication rides on an HttpOnly session cookie the browser sends
 * automatically; this client only adds the double-submit CSRF header on mutating requests.
 */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || 'Something went wrong');
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const SAFE = new Set(['GET', 'HEAD']);

/**
 * API origin + prefix. Empty VITE_API_BASE_URL (the default, used in every deployment here) means
 * same-origin `/api`, served by the Vite proxy, nginx, or a Vercel rewrite. Only set it to an origin
 * that shares the site's cookies (e.g. api.example.com for app.example.com): the session and CSRF
 * cookies are SameSite=Strict and cannot work against an unrelated domain.
 */
const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api`;

function readCookie(name) {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function ensureCsrf() {
  if (readCookie('ea_csrf')) return;
  await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  if (!SAFE.has(method)) await ensureCsrf();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(!SAFE.has(method) && { 'X-CSRF-Token': decodeURIComponent(readCookie('ea_csrf') || '') }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the Emergi-Access service. Check your connection.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error || {};
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new CustomEvent('ea:unauthorized'));
    throw new ApiError(res.status, e.code, e.message, e.details);
  }
  return data;
}

/** Downloads a protected file (PNG, PDF, CSV) using the session cookie. */
export async function download(path, filename) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data?.error?.code, data?.error?.message || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const str = s.toString();
  return str ? `?${str}` : '';
};
