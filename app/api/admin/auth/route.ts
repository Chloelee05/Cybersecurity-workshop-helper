import { NextRequest, NextResponse } from 'next/server';

// POST: Verify admin password (does not create session)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    // Simple password check (in production, use proper auth)
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

