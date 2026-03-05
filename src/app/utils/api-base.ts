function guessBackendOrigin(): string {
  // Dev: use same-origin and rely on Angular proxy (proxy.conf.json).
  // This makes login/orders work for many users on LAN without exposing port 5000.
  try {
    const port = String(window?.location?.port || '');
    if (port === '4200' || port === '4201') return '';

    const host = window?.location?.hostname;
    const protocol = window?.location?.protocol || 'http:';
    if (!host) return '';

    // Non-dev fallback: assume backend runs on :5000 on the same host.
    return `${protocol}//${host}:5000`;
  } catch {
    return '';
  }
}

export const BACKEND_ORIGIN = guessBackendOrigin();

export function apiUrl(path: string): string {
  const p = String(path || '').trim();
  if (!p) return `${BACKEND_ORIGIN}/api`;
  if (p.startsWith('/')) return `${BACKEND_ORIGIN}${p}`;
  return `${BACKEND_ORIGIN}/${p}`;
}
