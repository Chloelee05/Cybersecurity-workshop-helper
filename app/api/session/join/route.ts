import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionCode, userName } = body;

    if (!sessionCode || !userName) {
      return NextResponse.json(
        { error: 'Session code and user name required' },
        { status: 400 }
      );
    }

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('status')
      .eq('session_code', sessionCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if user already exists, if not, insert
    const { data: existing } = await supabase
      .from('participants')
      .select('user_name')
      .eq('session_code', sessionCode)
      .eq('user_name', userName)
      .single();

    if (!existing) {
      // Insert new participant
      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          session_code: sessionCode,
          user_name: userName,
        });

      if (insertError) {
        console.error('Error joining session:', insertError);
        // If it's a duplicate key error, that's okay - user already exists
        if (!insertError.message.includes('duplicate') && !insertError.message.includes('unique')) {
          return NextResponse.json(
            { error: 'Failed to join session' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      { success: true, status: session.status },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
