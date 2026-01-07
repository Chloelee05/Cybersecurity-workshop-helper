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
  question1TimeLimit?: number;
  question2TimeLimit?: number;
}

interface Result {
  userName: string;
  questionNumber: number;
  timeTaken: number;
  timestamp: string;
}

interface SessionListItem {
  session_code: string;
  status: string;
  current_question: number;
  created_at: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [timeLimit1, setTimeLimit1] = useState('300'); // 5 minutes default
  const [timeLimit2, setTimeLimit2] = useState('300');
  const [allSessions, setAllSessions] = useState<SessionListItem[]>([]);
  const [showSessionList, setShowSessionList] = useState(true); // Show by default
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const router = useRouter();

  // Always require password - no auto-login

  useEffect(() => {
    if (isAuthenticated) {
      const fetchSessions = async () => {
        try {
          const response = await fetch(`/api/admin/sessions?password=${encodeURIComponent(password)}`);
          if (response.ok) {
            const data = await response.json();
            setAllSessions(data.sessions || []);
          }
        } catch (err) {
          console.error('Error fetching sessions:', err);
        }
      };

      fetchSessions();
      const interval = setInterval(fetchSessions, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, password]);

  // Auto-refresh sessions when creating new one
  useEffect(() => {
    if (!isCreatingSession && isAuthenticated) {
      const fetchSessions = async () => {
        try {
          const response = await fetch(`/api/admin/sessions?password=${encodeURIComponent(password)}`);
          if (response.ok) {
            const data = await response.json();
            setAllSessions(data.sessions || []);
          }
        } catch (err) {
          console.error('Error fetching sessions:', err);
        }
      };
      fetchSessions();
    }
  }, [isCreatingSession, isAuthenticated, password]);

  useEffect(() => {
    if (sessionCode && isAuthenticated) {
      const fetchStatus = async () => {
        try {
          const [sessionResponse, resultsResponse] = await Promise.all([
            fetch(`/api/session?code=${sessionCode}`),
            fetch(`/api/results?sessionCode=${sessionCode}`),
          ]);
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            setSessionStatus(sessionData);
          }
          
          if (resultsResponse.ok) {
            const resultsData = await resultsResponse.json();
            setResults(resultsData.results || []);
          }
        } catch (err) {
          console.error('Error fetching status:', err);
        }
      };

      fetchStatus();
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [sessionCode, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    try {
      // Only verify password, don't create session
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        // Fetch sessions list after authentication
        const sessionsResponse = await fetch(`/api/admin/sessions?password=${encodeURIComponent(password)}`);
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setAllSessions(sessionsData.sessions || []);
        }
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Network error');
    }
  };

  const handleCreateSession = async () => {
    setIsCreatingSession(true);
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh sessions list
        const sessionsResponse = await fetch(`/api/admin/sessions?password=${encodeURIComponent(password)}`);
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setAllSessions(sessionsData.sessions || []);
          // Auto-select the newly created session
          setSessionCode(data.sessionCode);
        }
      } else {
        alert(data.error || 'Failed to create session');
      }
    } catch (err) {
      console.error('Error creating session:', err);
      alert('Network error');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleAction = async (action: string, timeLimit?: number, userName?: string) => {
    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          sessionCode,
          action,
          timeLimit,
          userName,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // If session code was reset, update it
        if (action === 'resetSessionCode' && data.newSessionCode) {
          const oldCode = sessionCode;
          setSessionCode(data.newSessionCode);
          
          // Refresh sessions list to show updated code
          const sessionsResponse = await fetch(`/api/admin/sessions?password=${encodeURIComponent(password)}`);
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            setAllSessions(sessionsData.sessions || []);
          }
        }
        
        // Refresh status
        const currentCode = data.newSessionCode || sessionCode;
        const statusResponse = await fetch(`/api/session?code=${currentCode}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setSessionStatus(statusData);
        } else if (statusResponse.status === 404) {
          // Session not found - clear status
          setSessionStatus(null);
        }
      } else {
        alert(data.error || 'Failed to perform action');
      }
    } catch (err) {
      console.error('Error performing action:', err);
      alert('Network error');
    }
  };

  const handleKickUser = async (userName: string) => {
    if (confirm(`Are you sure you want to kick ${userName}?`)) {
      await handleAction('kickUser', undefined, userName);
    }
  };

  const handleDeleteSession = async (code: string) => {
    if (confirm(`Are you sure you want to delete session ${code}? This cannot be undone.`)) {
      try {
        const response = await fetch(`/api/admin/sessions?password=${encodeURIComponent(password)}&sessionCode=${code}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          // If current session was deleted, clear it
          if (code === sessionCode) {
            setSessionCode('');
            setSessionStatus(null);
          }
          // Refresh session list
          const sessionsResponse = await fetch(`/api/admin/sessions?password=${encodeURIComponent(password)}`);
          if (sessionsResponse.ok) {
            const data = await sessionsResponse.json();
            setAllSessions(data.sessions || []);
          }
        } else {
          alert('Failed to delete session');
        }
      } catch (err) {
        console.error('Error deleting session:', err);
        alert('Network error');
      }
    }
  };

  const handleSelectSession = (code: string) => {
    setSessionCode(code);
    setShowSessionList(false);
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      waiting: 'Waiting for players',
      question1: 'Question 1 in progress',
      correct1: 'Question 1 completed - waiting to show dashboard',
      dashboard1: 'Question 1 results',
      question2: 'Question 2 in progress',
      correct2: 'Question 2 completed - waiting to show dashboard',
      dashboard2: 'Question 2 results',
      finished: 'Session finished',
    };
    return statusMap[status] || status;
  };

  const getQuestion1Results = () => {
    return results.filter(r => r.questionNumber === 1);
  };

  const getQuestion2Results = () => {
    return results.filter(r => r.questionNumber === 2);
  };

  const getCorrectUsers = (questionNum: number) => {
    const questionResults = results.filter(r => r.questionNumber === questionNum);
    return questionResults.map(r => r.userName);
  };

  const getIncorrectUsers = (questionNum: number) => {
    if (!sessionStatus) return [];
    const correctUsers = getCorrectUsers(questionNum);
    return sessionStatus.participants
      .map(p => p.userName)
      .filter(name => !correctUsers.includes(name));
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <main className="flex w-full max-w-md flex-col items-center justify-center px-8 py-12">
          <div className="w-full rounded-2xl bg-white p-8 shadow-2xl">
            <h1 className="mb-6 text-center text-4xl font-bold text-gray-800">
              Admin Login
            </h1>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Admin Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter admin password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                  style={{ color: '#111827' }}
                  autoFocus
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-105"
              >
                Login
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 py-12 px-4">
      <main className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Session List Section - Always Visible */}
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 border-2 border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Sessions</h2>
              <button
                onClick={handleCreateSession}
                disabled={isCreatingSession}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isCreatingSession ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Session
                  </>
                )}
              </button>
            </div>

            {allSessions.length === 0 ? (
              <div className="text-center py-12 rounded-xl bg-white/50 border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No sessions found</p>
                <p className="text-gray-400 text-sm mt-2">Click "Create New Session" to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Session Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allSessions.map((session) => (
                      <tr
                        key={session.session_code}
                        className={`cursor-pointer transition-colors ${
                          session.session_code === sessionCode
                            ? 'bg-gradient-to-r from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectSession(session.session_code)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-lg font-bold tracking-wider ${
                              session.session_code === sessionCode ? 'text-purple-700' : 'text-gray-900'
                            }`}>
                              {session.session_code}
                            </span>
                            {session.session_code === sessionCode && (
                              <span className="ml-2 px-2 py-1 text-xs font-bold bg-purple-600 text-white rounded-full">
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            session.status === 'waiting' ? 'bg-gray-200 text-gray-700' :
                            session.status === 'question1' || session.status === 'question2' ? 'bg-blue-100 text-blue-700' :
                            session.status === 'dashboard1' || session.status === 'dashboard2' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(session.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.session_code);
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Delete session"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Current Session Info */}
          {sessionCode && (
            <div className="mb-8 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 p-6 border-2 border-purple-200">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Current Session Code</p>
                <p className="text-5xl font-extrabold text-purple-700 tracking-wider mb-3">
                  {sessionCode}
                </p>
                <p className="text-sm text-gray-600">
                  Share this code with participants to join the session
                </p>
              </div>
            </div>
          )}

          {!sessionStatus && sessionCode && (
            <div className="mb-8 rounded-2xl bg-yellow-50 border-2 border-yellow-300 p-6">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-yellow-800 font-semibold">Session not found</p>
                  <p className="text-yellow-700 text-sm">The session may have been deleted or the server was restarted.</p>
                </div>
              </div>
            </div>
          )}

          {sessionStatus && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-6 text-white shadow-xl">
                <div className="mb-4">
                  <p className="text-sm text-blue-100 mb-1">Current Status</p>
                  <p className="text-2xl font-bold">
                    {getStatusText(sessionStatus.status)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-100 mb-1">Participants</p>
                  <p className="text-3xl font-extrabold mb-3">
                    {sessionStatus.participants.length}
                  </p>
                  {sessionStatus.participants.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto bg-white/10 rounded-lg p-2">
                      {sessionStatus.participants.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/20 rounded-lg p-2">
                          <span className="text-sm font-medium">{p.userName}</span>
                          <button
                            onClick={() => handleKickUser(p.userName)}
                            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                          >
                            Kick
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-6 text-white shadow-xl">
                <h3 className="font-bold text-xl mb-4">Question 1 Status</h3>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-green-100">Correct</span>
                      <span className="text-2xl font-extrabold">{getCorrectUsers(1).length}</span>
                    </div>
                    {getCorrectUsers(1).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="flex flex-wrap gap-1.5">
                          {getCorrectUsers(1).map((name, idx) => (
                            <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-green-100">Incorrect/Pending</span>
                      <span className="text-2xl font-extrabold">{getIncorrectUsers(1).length}</span>
                    </div>
                    {getIncorrectUsers(1).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="flex flex-wrap gap-1.5">
                          {getIncorrectUsers(1).map((name, idx) => (
                            <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(sessionStatus.status === 'question2' || sessionStatus.status === 'correct2' || sessionStatus.status === 'dashboard2') && (
                <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 p-6 text-white shadow-xl md:col-span-2 lg:col-span-1">
                  <h3 className="font-bold text-xl mb-4">Question 2 Status</h3>
                  <div className="space-y-3">
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-teal-100">Correct</span>
                        <span className="text-2xl font-extrabold">{getCorrectUsers(2).length}</span>
                      </div>
                      {getCorrectUsers(2).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <div className="flex flex-wrap gap-1.5">
                            {getCorrectUsers(2).map((name, idx) => (
                              <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-teal-100">Incorrect/Pending</span>
                        <span className="text-2xl font-extrabold">{getIncorrectUsers(2).length}</span>
                      </div>
                      {getIncorrectUsers(2).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <div className="flex flex-wrap gap-1.5">
                            {getIncorrectUsers(2).map((name, idx) => (
                              <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {sessionStatus?.status === 'waiting' && (
              <>
                <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-2 border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Question 1 Time Limit (seconds)
                  </label>
                  <input
                    type="number"
                    value={timeLimit1}
                    onChange={(e) => setTimeLimit1(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-gray-900 font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    min="60"
                    placeholder="300 (5 minutes)"
                  />
                </div>
                <button
                  onClick={() => handleAction('start', parseInt(timeLimit1))}
                  className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-green-600 hover:to-emerald-600 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  Start Question 1 ({Math.floor(parseInt(timeLimit1) / 60)}:{(parseInt(timeLimit1) % 60).toString().padStart(2, '0')})
                </button>
              </>
            )}

            {sessionStatus?.status === 'waiting' && (
              <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-6">
                <p className="text-blue-800 font-semibold text-center">Select a session to manage it</p>
              </div>
            )}

            {(sessionStatus?.status === 'question1' || sessionStatus?.status === 'correct1') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleAction('showDashboard1')}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  Show Dashboard 1
                </button>
                <button
                  onClick={() => router.push(`/dashboard/1?session=${sessionCode}&admin=true`)}
                  className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-indigo-700 hover:to-blue-700 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  View Dashboard 1
                </button>
              </div>
            )}

            {sessionStatus?.status === 'dashboard1' && (
              <>
                <button
                  onClick={() => router.push(`/dashboard/1?session=${sessionCode}&admin=true`)}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-indigo-700 hover:to-blue-700 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  View Dashboard 1
                </button>
                <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-2 border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Question 2 Time Limit (seconds)
                  </label>
                  <input
                    type="number"
                    value={timeLimit2}
                    onChange={(e) => setTimeLimit2(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-gray-900 font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    min="60"
                    placeholder="300 (5 minutes)"
                  />
                </div>
                <button
                  onClick={() => handleAction('startQuestion2', parseInt(timeLimit2))}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  Start Question 2 ({Math.floor(parseInt(timeLimit2) / 60)}:{(parseInt(timeLimit2) % 60).toString().padStart(2, '0')})
                </button>
              </>
            )}

            {(sessionStatus?.status === 'question2' || sessionStatus?.status === 'correct2') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleAction('showDashboard2')}
                  className="rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-orange-700 hover:to-red-700 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  Show Dashboard 2
                </button>
                <button
                  onClick={() => router.push(`/dashboard/2?session=${sessionCode}&admin=true`)}
                  className="rounded-2xl bg-gradient-to-r from-teal-600 to-green-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-teal-700 hover:to-green-700 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  View Dashboard 2
                </button>
              </div>
            )}

            {sessionStatus?.status === 'dashboard2' && (
              <button
                onClick={() => router.push(`/dashboard/2?session=${sessionCode}&admin=true`)}
                className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-green-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-teal-700 hover:to-green-700 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
              >
                View Dashboard 2
              </button>
            )}

            {sessionCode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t-2 border-gray-200">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to reset the session? This will clear all progress.')) {
                      handleAction('reset');
                    }
                  }}
                  className="rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-red-600 hover:to-pink-600 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  Reset Session
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to reset the session code? All participants will need to rejoin with the new code.')) {
                      handleAction('resetSessionCode');
                    }
                  }}
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-4 text-lg font-bold text-white shadow-xl transition-all hover:from-orange-600 hover:to-yellow-600 hover:shadow-2xl transform hover:scale-[1.02] active:scale-100"
                >
                  Reset Session Code
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
