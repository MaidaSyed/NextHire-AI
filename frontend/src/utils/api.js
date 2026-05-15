const API_BASE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

const USE_PROXY_IN_DEV =
  import.meta.env.DEV &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(API_BASE);

/**
 * Normalizes and returns the full API URL.
 * In development (if proxying to localhost) or if no API_BASE is set, 
 * it returns a relative /api path.
 * In production (on Vercel), it returns the relative /api path which 
 * is then handled by vercel.json rewrites.
 */
export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  
  // If we are in dev and proxying, or if we want to rely on Vercel rewrites
  // we return the relative path.
  if (USE_PROXY_IN_DEV || !API_BASE || import.meta.env.PROD) {
    return `/api${normalized}`;
  }

  return `${API_BASE}/api${normalized}`;
}

export async function postForm(path, formData) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function postJson(path, payload) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}
