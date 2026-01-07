'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SessionStatus {
  sessionCode: string;
  status: string;
  currentQuestion: number;
  participants: Array<{
    userName: string;
    joinedAt: string;
  }>;
}

export default function WaitingPage() {
  const [sessionCode, setSessionCode] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const router = useRouter();

  // Don't auto-login - always show login form

  useEffect(() => {
    // Check if kicked from sessionStorage
    const kicked = sessionStorage.getItem('kicked');
    if (kicked === 'true') {
      setIsKicked(true);
      sessionStorage.removeItem('kicked');
    }

    // Use sessionStorage for current session (per tab)
    const savedSessionCode = sessionStorage.getItem('sessionCode');
    const savedUserName = sessionStorage.getItem('userName');
    
    if (savedSessionCode && savedUserName && !isKicked) {
      setSessionCode(savedSessionCode);
      setUserName(savedUserName);
      checkSessionStatus(savedSessionCode);
    }
  }, []);

  useEffect(() => {
    if (sessionCode && userName && !isKicked) {
      const interval = setInterval(() => {
        checkSessionStatus(sessionCode);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [sessionCode, userName, isKicked]);

  const checkSessionStatus = async (code: string) => {
    try {
      const currentUserName = sessionStorage.getItem('userName') || userName;
      const response = await fetch(`/api/session?code=${code}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if current user was kicked
        const isUserParticipant = data.participants?.some(
          (p: { userName: string }) => p.userName === currentUserName
        );
        
        if (!isUserParticipant && currentUserName) {
          // User was kicked
          setIsKicked(true);
          sessionStorage.setItem('kicked', 'true');
          sessionStorage.removeItem('sessionCode');
          sessionStorage.removeItem('userName');
          return;
        }

        setSessionStatus(data);

        // Redirect based on status
        // Only redirect if status is a group state (not individual states)
        if (data.status === 'question1') {
          router.push(`/question/1?session=${code}`);
        } else if (data.status === 'dashboard1') {
          router.push(`/dashboard/1?session=${code}`);
        } else if (data.status === 'question2') {
          router.push(`/question/2?session=${code}`);
        } else if (data.status === 'dashboard2') {
          router.push(`/dashboard/2?session=${code}`);
        }
        // Don't redirect for correct1/correct2 - those are individual states
      }
    } catch (err) {
      console.error('Error checking session status:', err);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    setError('');

    if (!sessionCode.trim() || !userName.trim()) {
      setError('Please enter session code and name');
      setIsJoining(false);
      return;
    }

    try {
      // First verify session exists
      const checkResponse = await fetch(`/api/session?code=${sessionCode}`);
      if (!checkResponse.ok) {
        setError('Invalid session code');
        setIsJoining(false);
        return;
      }

      // Join session
      const joinResponse = await fetch('/api/session/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionCode: sessionCode.trim(),
          userName: userName.trim(),
        }),
      });

      const data = await joinResponse.json();

      if (joinResponse.ok) {
        // Use sessionStorage (per tab) instead of localStorage
        sessionStorage.setItem('sessionCode', sessionCode.trim());
        sessionStorage.setItem('userName', userName.trim());
        setSessionCode(sessionCode.trim());
        setUserName(userName.trim());
        setSessionStatus(await checkResponse.json());

        // Check if game already started
        if (data.status === 'question1') {
          router.push(`/question/1?session=${sessionCode}`);
        } else if (data.status === 'correct1') {
          router.push(`/correct/1?session=${sessionCode}`);
        } else if (data.status === 'dashboard1') {
          router.push(`/dashboard/1?session=${sessionCode}`);
        } else if (data.status === 'question2') {
          router.push(`/question/2?session=${sessionCode}`);
        } else if (data.status === 'correct2') {
          router.push(`/correct/2?session=${sessionCode}`);
        } else if (data.status === 'dashboard2') {
          router.push(`/dashboard/2?session=${sessionCode}`);
        }
      } else {
        setError(data.error || 'Failed to join session');
      }
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Network error');
    } finally {
      setIsJoining(false);
    }
  };

  if (isKicked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-500 via-pink-500 to-orange-500">
        <main className="flex w-full max-w-2xl flex-col items-center justify-center px-8 py-12">
          <div className="w-full rounded-2xl bg-white p-8 shadow-2xl text-center">
            <h1 className="mb-6 text-4xl font-bold text-red-600">
              ⚠️ You have been kicked
            </h1>
            <p className="mb-8 text-lg text-gray-600">
              You have been removed from the session by the admin.
            </p>
            <button
              onClick={() => {
                setIsKicked(false);
                setSessionCode('');
                setUserName('');
                setSessionStatus(null);
                router.push('/');
              }}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-xl"
            >
              Return to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500">
      <main className="flex w-full max-w-2xl flex-col items-center justify-center px-8 py-12">
        <div className="w-full rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="mb-6 text-center text-4xl font-bold text-gray-800">
            Cybersecurity Workshop
          </h1>
          
          {!sessionStatus ? (
            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <label 
                  htmlFor="sessionCode" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Session Code
                </label>
                <input
                  id="sessionCode"
                  type="text"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="Enter session code"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg uppercase tracking-wider text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                  style={{ color: '#111827' }}
                  autoFocus
                  maxLength={6}
                />
              </div>

              <div>
                <label 
                  htmlFor="userName" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Your Name
                </label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                  style={{ color: '#111827' }}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}
              
              <button
                type="submit"
                disabled={isJoining}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Joining...' : 'Join Session'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg text-gray-600 mb-2">Session Code</p>
                <p className="text-3xl font-bold text-purple-700 tracking-wider">
                  {sessionStatus.sessionCode}
                </p>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-semibold text-gray-800">
                  Participants ({sessionStatus.participants.length})
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sessionStatus.participants.map((participant, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between rounded-lg p-3 ${
                        participant.userName === userName
                          ? 'bg-purple-100 border-2 border-purple-400'
                          : 'bg-gray-50'
                      }`}
                    >
                      <span className="font-medium text-gray-800">
                        {participant.userName}
                        {participant.userName === userName && ' (You)'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(participant.joinedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-blue-800 font-medium">
                  Waiting for admin to start the game...
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

