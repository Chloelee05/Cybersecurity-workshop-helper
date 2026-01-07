import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionCode, userName, questionNumber, timeTaken, timestamp } = body;

    if (!sessionCode || !userName || !questionNumber || timeTaken === undefined) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Save result to Supabase
    const { data, error } = await supabase
      .from('results')
      .insert({
        session_code: sessionCode,
        user_name: userName,
        question_number: questionNumber,
        time_taken: timeTaken,
        timestamp: timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving result:', error);
      return NextResponse.json(
        { error: 'Failed to save result' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        result: {
          sessionCode: data.session_code,
          userName: data.user_name,
          questionNumber: data.question_number,
          timeTaken: data.time_taken,
          timestamp: data.timestamp,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving result:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const questionParam = searchParams.get('question');
    const sessionCodeParam = searchParams.get('sessionCode');

    // Build query
    let query = supabase
      .from('results')
      .select('*');

    // Filter by session code
    if (sessionCodeParam) {
      query = query.eq('session_code', sessionCodeParam);
    }

    // Filter by question number
    if (questionParam) {
      const questionNumber = parseInt(questionParam);
      if (!isNaN(questionNumber)) {
        query = query.eq('question_number', questionNumber);
      }
    }

    const { data, error } = await query.order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching results:', error);
      return NextResponse.json(
        { error: 'Failed to fetch results' },
        { status: 500 }
      );
    }

    // Transform to match expected format
    const results = (data || []).map(r => ({
      sessionCode: r.session_code,
      userName: r.user_name,
      questionNumber: r.question_number,
      timeTaken: r.time_taken,
      timestamp: r.timestamp,
    }));

    return NextResponse.json(
      { results },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
