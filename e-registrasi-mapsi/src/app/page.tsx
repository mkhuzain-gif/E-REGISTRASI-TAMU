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
    <div className="fixed inset-0 bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#047857]" />
  );
}
