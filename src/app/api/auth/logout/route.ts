import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

// ── POST /api/auth/logout ────────────────────────────────────────────────

export async function POST() {
  try {
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('[AUTH/LOGOUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
