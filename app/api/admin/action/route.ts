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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, sessionCode, action, timeLimit, userName } = body;

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

    // Fetch current session from Supabase
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    let updateData: any = {};

    switch (action) {
      case 'start':
        if (session.status !== 'waiting') {
          return NextResponse.json(
            { error: 'Session already started' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'question1',
          current_question: 1,
          question1_start_time: new Date().toISOString(),
        };
        if (timeLimit) {
          updateData.question1_time_limit = parseInt(timeLimit);
        }
        break;

      case 'startQuestion2':
        if (session.status !== 'dashboard1') {
          return NextResponse.json(
            { error: 'Must be on dashboard1 to start question 2' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'question2',
          current_question: 2,
          question2_start_time: new Date().toISOString(),
        };
        if (timeLimit) {
          updateData.question2_time_limit = parseInt(timeLimit);
        }
        break;

      case 'showDashboard1':
        if (session.status !== 'question1' && session.status !== 'correct1') {
          return NextResponse.json(
            { error: 'Must be on question1 or correct1 to show dashboard' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'dashboard1',
        };
        break;

      case 'showDashboard2':
        if (session.status !== 'question2' && session.status !== 'correct2') {
          return NextResponse.json(
            { error: 'Must be on question2 or correct2 to show dashboard' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'dashboard2',
        };
        break;

      case 'next':
        if (session.status === 'dashboard1') {
          updateData = {
            status: 'question2',
            current_question: 2,
            question2_start_time: new Date().toISOString(),
          };
        } else if (session.status === 'dashboard2') {
          updateData = {
            status: 'finished',
          };
        } else {
          return NextResponse.json(
            { error: 'Cannot proceed from current state' },
            { status: 400 }
          );
        }
        break;

      case 'reset':
        updateData = {
          status: 'waiting',
          current_question: 0,
          question1_start_time: null,
          question2_start_time: null,
        };
        // Also clear participants
        await supabase
          .from('participants')
          .delete()
          .eq('session_code', sessionCode);
        break;

      case 'kickUser':
        if (!userName) {
          return NextResponse.json(
            { error: 'User name required' },
            { status: 400 }
          );
        }
        // Delete participant
        const { error: deleteError } = await supabase
          .from('participants')
          .delete()
          .eq('session_code', sessionCode)
          .eq('user_name', userName);

        if (deleteError) {
          console.error('Error kicking user:', deleteError);
          return NextResponse.json(
            { error: 'Failed to kick user' },
            { status: 500 }
          );
        }

        // Fetch updated session and participants
        const { data: updatedSession } = await supabase
          .from('sessions')
          .select('*, participants(user_name, joined_at)')
          .eq('session_code', sessionCode)
          .single();

        const { data: participants } = await supabase
          .from('participants')
          .select('user_name, joined_at')
          .eq('session_code', sessionCode)
          .order('joined_at', { ascending: true });

        return NextResponse.json(
          {
            success: true,
            status: updatedSession?.status || session.status,
            currentQuestion: updatedSession?.current_question || session.current_question,
            participants: (participants || []).map(p => ({
              userName: p.user_name,
              joinedAt: p.joined_at,
            })),
            question1TimeLimit: updatedSession?.question1_time_limit || session.question1_time_limit,
            question2TimeLimit: updatedSession?.question2_time_limit || session.question2_time_limit,
            question1StartTime: updatedSession?.question1_start_time || session.question1_start_time,
            question2StartTime: updatedSession?.question2_start_time || session.question2_start_time,
          },
          { status: 200 }
        );

      case 'resetSessionCode':
        // Generate new session code
        let newCode = generateSessionCode();
        let attempts = 0;

        // Check if code already exists
        while (attempts < 10) {
          const { data: existing } = await supabase
            .from('sessions')
            .select('session_code')
            .eq('session_code', newCode)
            .single();

          if (!existing) {
            break;
          }
          newCode = generateSessionCode();
          attempts++;
        }

        if (attempts >= 10) {
          return NextResponse.json(
            { error: 'Failed to generate unique session code' },
            { status: 500 }
          );
        }

        // Update session code using a transaction-like approach
        // Since Supabase doesn't support transactions in JS client, we need to be careful
        
        // Step 1: Update participants to use new code
        const { error: updateParticipantsError, count: participantsCount } = await supabase
          .from('participants')
          .update({ session_code: newCode })
          .eq('session_code', sessionCode);

        if (updateParticipantsError) {
          console.error('Error updating participants:', updateParticipantsError);
          return NextResponse.json(
            { error: 'Failed to update participants with new code' },
            { status: 500 }
          );
        }

        // Step 2: Update results to use new code
        const { error: updateResultsError } = await supabase
          .from('results')
          .update({ session_code: newCode })
          .eq('session_code', sessionCode);

        if (updateResultsError) {
          console.error('Error updating results:', updateResultsError);
          // Try to rollback participants
          await supabase
            .from('participants')
            .update({ session_code: sessionCode })
            .eq('session_code', newCode);
          return NextResponse.json(
            { error: 'Failed to update results with new code' },
            { status: 500 }
          );
        }

        // Step 3: Finally, update session code
        const { data: updated, error: updateError } = await supabase
          .from('sessions')
          .update({ session_code: newCode })
          .eq('session_code', sessionCode)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating session code:', updateError);
          // Try to rollback participants and results
          await supabase
            .from('participants')
            .update({ session_code: sessionCode })
            .eq('session_code', newCode);
          await supabase
            .from('results')
            .update({ session_code: sessionCode })
            .eq('session_code', newCode);
          return NextResponse.json(
            { error: 'Failed to reset session code' },
            { status: 500 }
          );
        }

        // Clear participants (optional - you might want to keep them)
        await supabase
          .from('participants')
          .delete()
          .eq('session_code', newCode);

        // Fetch participants
        const { data: newParticipants } = await supabase
          .from('participants')
          .select('user_name, joined_at')
          .eq('session_code', newCode)
          .order('joined_at', { ascending: true });

        return NextResponse.json(
          {
            success: true,
            newSessionCode: newCode,
            status: updated.status,
            currentQuestion: updated.current_question,
            participants: (newParticipants || []).map(p => ({
              userName: p.user_name,
              joinedAt: p.joined_at,
            })),
            question1TimeLimit: updated.question1_time_limit,
            question2TimeLimit: updated.question2_time_limit,
            question1StartTime: updated.question1_start_time,
            question2StartTime: updated.question2_start_time,
          },
          { status: 200 }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update session in Supabase
    if (Object.keys(updateData).length > 0) {
      const { data: updatedSession, error: updateError } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('session_code', sessionCode)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating session:', updateError);
        return NextResponse.json(
          { error: 'Failed to update session' },
          { status: 500 }
        );
      }

      // Fetch participants
      const { data: participants } = await supabase
        .from('participants')
        .select('user_name, joined_at')
        .eq('session_code', sessionCode)
        .order('joined_at', { ascending: true });

      return NextResponse.json(
        {
          success: true,
          status: updatedSession.status,
          currentQuestion: updatedSession.current_question,
          participants: (participants || []).map(p => ({
            userName: p.user_name,
            joinedAt: p.joined_at,
          })),
          question1TimeLimit: updatedSession.question1_time_limit,
          question2TimeLimit: updatedSession.question2_time_limit,
          question1StartTime: updatedSession.question1_start_time,
          question2StartTime: updatedSession.question2_start_time,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'No action performed' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error performing admin action:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
