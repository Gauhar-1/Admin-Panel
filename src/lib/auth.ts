import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ── Constants ────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** 15 minutes in seconds */
export const ACCESS_TOKEN_EXPIRY = 15 * 60;
/** 7 days in seconds */
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60;

// ── Secret Key Encoding ──────────────────────────────────────────────────

function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined in environment variables');
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  return new TextEncoder().encode(secret);
}

// ── Token Payload Interface ──────────────────────────────────────────────

export interface AuthTokenPayload extends JWTPayload {
  sub: string;    // admin user ID
  email: string;
  name: string;
}

// ── Password Hashing ────────────────────────────────────────────────────

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// ── JWT Signing ──────────────────────────────────────────────────────────

export async function signAccessToken(payload: { sub: string; email: string; name: string }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY}s`)
    .sign(getAccessSecret());
}

export async function signRefreshToken(payload: { sub: string; email: string; name: string }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRY}s`)
    .sign(getRefreshSecret());
}

// ── JWT Verification ─────────────────────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret());
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

// ── Cookie Helpers (for API routes / Server Actions) ─────────────────────

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: ACCESS_TOKEN_EXPIRY,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_EXPIRY,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

// ── Server-side cookie reader (for Server Components / Route Handlers) ──

export async function getAuthUser(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) return null;
  return verifyAccessToken(accessToken);
}
