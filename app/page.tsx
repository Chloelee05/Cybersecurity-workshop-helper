'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500">
      <main className="flex w-full max-w-md flex-col items-center justify-center px-8 py-12">
        <div className="w-full rounded-2xl bg-white p-8 shadow-2xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-gray-800">
            Cybersecurity Workshop
          </h1>
          
          <p className="mb-8 text-lg text-gray-600">
            Join a session or access admin panel
          </p>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/waiting')}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-xl transform hover:scale-105"
            >
              Join Session
            </button>

            <button
              onClick={() => router.push('/admin')}
              className="w-full rounded-lg border-2 border-purple-600 px-6 py-4 text-lg font-semibold text-purple-600 transition-all hover:bg-purple-50 transform hover:scale-105"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
