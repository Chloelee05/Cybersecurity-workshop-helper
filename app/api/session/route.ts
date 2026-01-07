import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Generate random session code
function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST: Create session (admin only)
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

    // Generate session code
    let sessionCode = generateSessionCode();
    let attempts = 0;
    
    // Check if code already exists (very unlikely, but just in case)
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('sessions')
        .select('session_code')
        .eq('session_code', sessionCode)
        .single();

      if (!existing) {
        break; // Code is unique
      }
      sessionCode = generateSessionCode();
      attempts++;
    }

    // Create new session in Supabase
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        session_code: sessionCode,
        status: 'waiting',
        current_question: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, sessionCode },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

// GET: Get session status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionCode = searchParams.get('code');

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Session code required' },
        { status: 400 }
      );
    }

    // Fetch session from Supabase
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Fetch participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('user_name, joined_at')
      .eq('session_code', sessionCode)
      .order('joined_at', { ascending: true });

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
    }

    // Return session with participants
    return NextResponse.json({
      sessionCode: session.session_code,
      status: session.status,
      currentQuestion: session.current_question,
      participants: (participants || []).map(p => ({
        userName: p.user_name,
        joinedAt: p.joined_at,
      })),
      question1TimeLimit: session.question1_time_limit,
      question2TimeLimit: session.question2_time_limit,
      question1StartTime: session.question1_start_time,
      question2StartTime: session.question2_start_time,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
