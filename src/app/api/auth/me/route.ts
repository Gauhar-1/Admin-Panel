import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// ── GET /api/auth/me ─────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.sub,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('[AUTH/ME] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
