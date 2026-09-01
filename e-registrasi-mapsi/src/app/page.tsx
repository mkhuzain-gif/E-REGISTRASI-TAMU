'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

/**
 * Root page — redirects to dashboard if logged in, otherwise to login
 */
export default function HomePage() {
  const router = useRouter();
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="neo-card p-8 text-center animate-bounce-in">
        <div className="text-4xl mb-3">🕌</div>
        <p className="font-bold text-brand-900">MAPSI 2026</p>
        <p className="text-sm text-brand-700 mt-1">Memuat sistem...</p>
      </div>
    </div>
  );
}
