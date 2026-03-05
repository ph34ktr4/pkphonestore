import { BACKEND_ORIGIN } from './api-base';

export function toBackendImageUrl(image?: string | null): string {
  const raw = String(image ?? '').trim();
  if (!raw) return '';

  // Absolute URL: if it points to an uploads path, normalize to current backend/proxy.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (u.pathname.startsWith('/uploads/')) {
        return `${BACKEND_ORIGIN}${u.pathname}`;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  // Normalize Windows backslashes and strip any leading "public"
  const normalized = raw.replace(/\\/g, '/').replace(/^public\//, '');

  // Handle common browser file-input values like: C:\\fakepath\\image.jpg
  // or Windows drive paths stored by mistake.
  if (/(^|\/)fakepath\//i.test(normalized) || /^[a-z]:\//i.test(normalized)) {
    const base = normalized.split('/').pop() || '';
    if (base) return `${BACKEND_ORIGIN}/uploads/${base}`;
  }

  // If the stored value contains uploads path anywhere, normalize to /uploads/...
  const uploadsIdx = normalized.indexOf('/uploads/');
  if (uploadsIdx >= 0) {
    return `${BACKEND_ORIGIN}${normalized.slice(uploadsIdx)}`;
  }

  const uploadsIdx2 = normalized.indexOf('uploads/');
  if (uploadsIdx2 >= 0) {
    return `${BACKEND_ORIGIN}/${normalized.slice(uploadsIdx2)}`;
  }

  // If it's just a filename, assume it lives in /uploads
  if (/^[^/]+\.(png|jpg|jpeg|webp|gif)$/i.test(normalized)) {
    return `${BACKEND_ORIGIN}/uploads/${normalized}`;
  }

  // Otherwise treat as a path relative to backend root
  if (normalized.startsWith('/')) return `${BACKEND_ORIGIN}${normalized}`;
  return `${BACKEND_ORIGIN}/${normalized}`;
}
