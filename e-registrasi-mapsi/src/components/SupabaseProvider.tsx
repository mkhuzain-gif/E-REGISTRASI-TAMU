'use client';

/**
 * SupabaseProvider — menginisialisasi data dari Supabase saat aplikasi pertama dibuka
 * dan mengaktifkan realtime subscription selama sesi berlangsung.
 */

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { initialize, startRealtime } = useStore();

  useEffect(() => {
    // Load data awal dari Supabase
    initialize();

    // Aktifkan realtime & simpan fungsi cleanup
    const unsubscribe = startRealtime();

    return () => {
      unsubscribe();
    };
  }, [initialize, startRealtime]);

  return <>{children}</>;
}
