import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

// ── Constants (duplicated from lib/auth.ts because middleware runs in Edge) ──

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds

function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  return new TextEncoder().encode(secret);
}

// ── Security Headers ─────────────────────────────────────────────────────

const securityHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

// ── Path Checks ──────────────────────────────────────────────────────────

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api');
}

// ── CSRF Validation ──────────────────────────────────────────────────────

function validateCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || `http://${host}`;
  const normalizedAllowed = allowedOrigin.toLowerCase().replace(/\/+$/, '');

  if (origin) {
    return origin.toLowerCase().replace(/\/+$/, '') === normalizedAllowed;
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin.toLowerCase().replace(/\/+$/, '');
      return refererOrigin === normalizedAllowed;
    } catch {
      return false;
    }
  }

  return false;
}

// ── Middleware ────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets entirely
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // ── 1. CSRF Validation on Mutating API Requests ──
  if (isApiRoute(pathname) && !validateCsrf(request)) {
    return NextResponse.json(
      { success: false, error: 'CSRF validation failed: invalid origin' },
      { status: 403 }
    );
  }

  // ── 2. Allow Public Paths Through (with security headers) ──
  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // ── 3. Token Verification for Protected Routes ──
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Try verifying the access token
  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, getAccessSecret());
      
      // Valid access token — proceed with user info in headers
      const response = NextResponse.next();
      response.headers.set('x-user-id', payload.sub as string);
      response.headers.set('x-user-email', payload.email as string);
      response.headers.set('x-user-name', payload.name as string);
      applySecurityHeaders(response);

      // If on /login with valid token, redirect to dashboard
      if (pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      return response;
    } catch {
      // Access token invalid or expired — fall through to refresh
    }
  }

  // ── 4. Silent Token Rotation via Refresh Token ──
  if (refreshToken) {
    try {
      const { payload } = await jwtVerify(refreshToken, getRefreshSecret());

      // Refresh token is valid — issue a new access token
      const newAccessToken = await new SignJWT({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TOKEN_EXPIRY}s`)
        .sign(getAccessSecret());

      const response = NextResponse.next();
      response.headers.set('x-user-id', payload.sub as string);
      response.headers.set('x-user-email', payload.email as string);
      response.headers.set('x-user-name', payload.name as string);
      applySecurityHeaders(response);

      // Set the new access token cookie
      response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: ACCESS_TOKEN_EXPIRY,
      });

      // If on /login with valid refresh, redirect to dashboard
      if (pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      return response;
    } catch {
      // Refresh token also invalid — fall through to reject
    }
  }

  // ── 5. No Valid Tokens — Reject ──

  // If on /login already, just allow through
  if (pathname === '/login') {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // API routes get a 401 JSON response
  if (isApiRoute(pathname)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Page routes get redirected to /login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', pathname);
  const redirectResponse = NextResponse.redirect(loginUrl);
  applySecurityHeaders(redirectResponse);
  return redirectResponse;
}

// ── Helper: Apply Security Headers ───────────────────────────────────────

function applySecurityHeaders(response: NextResponse): void {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
}

// ── Matcher Configuration ────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
