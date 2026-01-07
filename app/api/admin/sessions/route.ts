import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Get all sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');

    // Verify admin password
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Fetch all sessions
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('session_code, status, current_question, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { sessions: sessions || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    const sessionCode = searchParams.get('sessionCode');

    // Verify admin password
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Session code required' },
        { status: 400 }
      );
    }

    // Delete session (cascade will delete participants and results)
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('session_code', sessionCode);

    if (error) {
      console.error('Error deleting session:', error);
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

