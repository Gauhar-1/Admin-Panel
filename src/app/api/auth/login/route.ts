import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
} from '@/lib/auth';
import { isRateLimited, recordFailedAttempt, resetRateLimit, getRemainingAttempts } from '@/lib/rate-limit';
import { z } from 'zod';

// ── Request Schema ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ── POST /api/auth/login ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Extract client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // 2. Check rate limit
    const { blocked, retryAfterSeconds } = isRateLimited(ip);
    if (blocked) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // 4. Connect to database and find admin
    await dbConnect();
    const admin = await Admin.findOne({ email }).select('+passwordHash');

    if (!admin) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        {
          status: 401,
          headers: {
            'X-RateLimit-Remaining': String(getRemainingAttempts(ip)),
          },
        }
      );
    }

    // 5. Verify password
    const isValidPassword = await verifyPassword(password, admin.passwordHash);

    if (!isValidPassword) {
      const nowBlocked = recordFailedAttempt(ip);
      return NextResponse.json(
        {
          success: false,
          error: nowBlocked
            ? 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.'
            : 'Invalid email or password',
        },
        {
          status: nowBlocked ? 429 : 401,
          headers: {
            'X-RateLimit-Remaining': String(getRemainingAttempts(ip)),
          },
        }
      );
    }

    // 6. Success — generate tokens
    resetRateLimit(ip);

    const tokenPayload = {
      sub: admin._id.toString(),
      email: admin.email,
      name: admin.name,
    };

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    // 7. Set HttpOnly cookies and respond
    const response = NextResponse.json(
      {
        success: true,
        data: {
          email: admin.email,
          name: admin.name,
        },
      },
      { status: 200 }
    );

    setAuthCookies(response, accessToken, refreshToken);

    return response;
  } catch (error) {
    console.error('[AUTH/LOGIN] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
