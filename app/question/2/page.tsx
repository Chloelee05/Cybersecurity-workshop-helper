'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Question2() {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('session') || sessionStorage.getItem('sessionCode') || '';

  // Correct answer (update as needed)
  const correctAnswer = 'ANSWER2'; // Change this to your actual answer

  useEffect(() => {
    if (!sessionCode) {
      router.push('/waiting');
      return;
    }

    // Check if user already submitted - if so, go to correct page
    const hasSubmitted = sessionStorage.getItem(`submitted_${sessionCode}_q2`);
    if (hasSubmitted) {
      router.push(`/correct/2?session=${sessionCode}`);
      return;
    }

    // Check session status and get time limit
    const checkStatus = async () => {
      try {
        const currentUserName = sessionStorage.getItem('userName');
        const response = await fetch(`/api/session?code=${sessionCode}`);
        if (response.ok) {
          const data = await response.json();
          
          // Check if user was kicked
          const isUserParticipant = data.participants?.some(
            (p: { userName: string }) => p.userName === currentUserName
          );
          
          if (!isUserParticipant && currentUserName) {
            // User was kicked
            sessionStorage.setItem('kicked', 'true');
            sessionStorage.removeItem('sessionCode');
            sessionStorage.removeItem('userName');
            router.push('/waiting');
            return;
          }

          if (data.status !== 'question2') {
            // Redirect based on status - only group states
            if (data.status === 'dashboard2') {
              router.push(`/dashboard/2?session=${sessionCode}`);
            } else if (data.status === 'waiting' || data.status === 'question1' || data.status === 'dashboard1') {
              router.push(`/waiting`);
            }
          } else {
            // Set time limit and start time if available
            if (data.question2TimeLimit && data.question2StartTime) {
              const serverStartTime = new Date(data.question2StartTime).getTime();
              if (!questionStartTime) {
                setQuestionStartTime(serverStartTime);
                setStartTime(serverStartTime);
              }
              if (data.question2TimeLimit && !timeLimit) {
                setTimeLimit(data.question2TimeLimit);
                setTimeRemaining(data.question2TimeLimit);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [sessionCode, router]);

  // Timer countdown - calculate from server start time
  useEffect(() => {
    if (timeLimit !== null && questionStartTime !== null) {
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - questionStartTime) / 1000);
        const remaining = Math.max(0, timeLimit - elapsed);
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          return false; // Stop timer
        }
        return true; // Continue timer
      };

      // Initial update
      if (!updateTimer()) {
        return;
      }

      // Update every second
      const timer = setInterval(() => {
        if (!updateTimer()) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLimit, questionStartTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate answer
    if (!answer.trim()) {
      setError('Please enter an answer');
      setIsSubmitting(false);
      return;
    }

    // Check answer
    if (answer.trim() !== correctAnswer) {
      setError('Incorrect answer. Please try again.');
      setIsSubmitting(false);
      return;
    }

    // Calculate time and save result
    const timeTaken = startTime ? Date.now() - startTime : 0;
    const userName = sessionStorage.getItem('userName') || 'Anonymous';

    try {
      // Submit result to API
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionCode,
          userName,
          questionNumber: 2,
          timeTaken,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Save to sessionStorage that this user has submitted
        sessionStorage.setItem(`submitted_${sessionCode}_q2`, 'true');
        // Redirect to correct page (waiting for admin)
        router.push(`/correct/2?session=${sessionCode}`);
      } else {
        setError('Failed to save result');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Error submitting result:', err);
      setError('Network error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-500 via-teal-500 to-cyan-500">
      <main className="flex w-full max-w-2xl flex-col items-center justify-center px-8 py-12">
        <div className="w-full rounded-2xl bg-white p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800">
              Question 2
            </h2>
            {timeRemaining !== null && (
              <div className={`px-4 py-2 rounded-lg font-bold ${
                timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
          
          <p className="mb-8 text-lg text-gray-600">
            Enter your answer below.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="answer" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Answer
              </label>
              <input
                id="answer"
                type="text"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setError('');
                }}
                placeholder="Enter your answer"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 transition-all"
                style={{ color: '#111827' }}
                autoFocus
                disabled={isSubmitting}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-green-700 hover:to-teal-700 hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
