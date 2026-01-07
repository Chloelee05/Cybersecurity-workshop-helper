'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

export default function CorrectPage() {
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

    // Check session status - if admin shows dashboard, redirect there
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

          if (questionNumber === 1 && data.status === 'dashboard1') {
            router.push(`/dashboard/1?session=${sessionCode}`);
          } else if (questionNumber === 2 && data.status === 'dashboard2') {
            router.push(`/dashboard/2?session=${sessionCode}`);
          } else if (questionNumber === 1 && data.status === 'question2') {
            router.push(`/question/2?session=${sessionCode}`);
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [sessionCode, questionNumber, router]);

  const colors = questionNumber === 1 
    ? 'from-green-500 via-teal-500 to-cyan-500'
    : 'from-orange-500 via-red-500 to-pink-500';

  return (
    <div className={`flex min-h-screen items-center justify-center bg-gradient-to-br ${colors}`}>
      <main className="flex w-full max-w-2xl flex-col items-center justify-center px-8 py-12">
        <div className="w-full rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mb-6">
            <div className="text-8xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Correct!
            </h1>
            <p className="text-xl text-gray-600">
              Please wait for the admin to show the dashboard.
            </p>
          </div>
          <div className="mt-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </main>
    </div>
  );
}

