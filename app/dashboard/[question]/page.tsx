'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

interface Result {
  userName: string;
  questionNumber: number;
  timeTaken: number;
  timestamp: string;
}

function DashboardContent() {
  const [results, setResults] = useState<Result[]>([]);
  const [userResult, setUserResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const questionNumber = parseInt(params.question as string) || 1;
  const sessionCode = searchParams.get('session') || sessionStorage.getItem('sessionCode') || '';

  useEffect(() => {
    if (!sessionCode) {
      router.push('/waiting');
      return;
    }

    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/results?question=${questionNumber}&sessionCode=${sessionCode}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          
          // Find current user's result
          const userName = sessionStorage.getItem('userName');
          const user = data.results?.find((r: Result) => r.userName === userName);
          if (user) {
            setUserResult(user);
          }
        }
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
    
    // Poll for updates
    const interval = setInterval(fetchResults, 2000);
    return () => clearInterval(interval);
  }, [questionNumber, sessionCode, router]);

  useEffect(() => {
    // Check session status and redirect if needed
    const checkStatus = async () => {
      if (!sessionCode) return;
      
      const isAdmin = searchParams.get('admin') === 'true';
      if (isAdmin) return; // Admin can stay on dashboard
      
      try {
        const response = await fetch(`/api/session?code=${sessionCode}`);
        if (response.ok) {
          const data = await response.json();
          
          // Redirect if status changed
          if (questionNumber === 1) {
            if (data.status === 'question1' || data.status === 'correct1') {
              // Still in question 1 phase
            } else if (data.status === 'question2' || data.status === 'correct2' || data.status === 'dashboard2') {
              router.push(`/question/2?session=${sessionCode}`);
            } else if (data.status === 'waiting') {
              router.push(`/waiting`);
            }
          } else if (questionNumber === 2) {
            if (data.status === 'question2' || data.status === 'correct2') {
              // Still in question 2 phase
            } else if (data.status !== 'dashboard2' && data.status !== 'finished') {
              router.push(`/waiting`);
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
  }, [sessionCode, questionNumber, router, searchParams]);

  const formatTime = (ms: number) => {
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  };

  // Sort by time
  const sortedResults = [...results].sort((a, b) => a.timeTaken - b.timeTaken);
  const userRank = userResult 
    ? sortedResults.findIndex(r => r.userName === userResult.userName) + 1 
    : null;

  const colors = questionNumber === 1 
    ? 'from-green-500 via-teal-500 to-cyan-500'
    : 'from-orange-500 via-red-500 to-pink-500';

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-gradient-to-br ${colors}`}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors} py-12 px-4`}>
      <main className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-5xl font-bold text-white">
            🎉 Correct!
          </h1>
          <p className="text-xl text-white/90">
            Question {questionNumber} Results
          </p>
        </div>

        {userResult && (
          <div className="mb-8 rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                {userResult.userName}'s Result
              </h2>
              <div className="flex items-center justify-center gap-4">
                <div className="rounded-lg bg-green-100 px-6 py-4">
                  <div className="text-sm text-green-600">Time</div>
                  <div className="text-3xl font-bold text-green-700">
                    {formatTime(userResult.timeTaken)}
                  </div>
                </div>
                {userRank && (
                  <div className="rounded-lg bg-purple-100 px-6 py-4">
                    <div className="text-sm text-purple-600">Rank</div>
                    <div className="text-3xl font-bold text-purple-700">
                      #{userRank}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">
            Leaderboard
          </h2>
          
          {sortedResults.length === 0 ? (
            <p className="text-center text-gray-500">
              No results yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedResults.map((result, index) => {
                const isUser = result.userName === userResult?.userName;
                return (
                  <div
                    key={`${result.userName}-${result.timestamp}`}
                    className={`flex items-center justify-between rounded-lg p-4 ${
                      isUser
                        ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-300 text-orange-900' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {result.userName}
                          {isUser && ' (You)'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-700">
                      {formatTime(result.timeTaken)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="rounded-lg bg-white/20 p-4 mb-4">
            <p className="text-white font-medium">
              {questionNumber === 1 
                ? 'Waiting for admin to start Question 2...'
                : 'Workshop completed!'}
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            {searchParams.get('admin') === 'true' && (
              <button
                onClick={() => router.push('/admin')}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
              >
                Back to Admin Panel
              </button>
            )}
            <button
              onClick={() => router.push('/waiting')}
              className="rounded-lg bg-white px-6 py-3 font-semibold text-gray-800 shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl"
            >
              Back to Waiting Room
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-500 via-teal-500 to-cyan-500">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

