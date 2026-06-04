import { NextRequest } from 'next/server';

/**
 * Validates that a mutating request (POST, PUT, DELETE, PATCH) originates
 * from our own domain by checking the Origin and Referer headers.
 *
 * Returns `true` if the request is safe, `false` if it's a potential CSRF attack.
 */
export function validateCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();

  // Only validate mutating methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Determine the allowed origin
  const allowedOrigin = getAllowedOrigin(request);

  // Check Origin header first (most reliable)
  if (origin) {
    return normalizeOrigin(origin) === normalizeOrigin(allowedOrigin);
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return normalizeOrigin(refererUrl.origin) === normalizeOrigin(allowedOrigin);
    } catch {
      return false;
    }
  }

  // If neither header is present, reject the request.
  // This is a strict policy; some legitimate same-origin requests from
  // older browsers may not send these headers, but modern browsers always do.
  return false;
}

/**
 * Determines the allowed origin from environment or the Host header.
 */
function getAllowedOrigin(request: NextRequest): string {
  // Prefer explicit config
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Fall back to the Host header
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return `${protocol}://${host}`;
}

/**
 * Normalizes an origin string for comparison (lowercase, strip trailing slash).
 */
function normalizeOrigin(origin: string): string {
  return origin.toLowerCase().replace(/\/+$/, '');
}
