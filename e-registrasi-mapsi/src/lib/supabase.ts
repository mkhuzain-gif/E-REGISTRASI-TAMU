/**
 * Supabase client singleton untuk E-Registrasi MAPSI 2026
 * Import `supabase` dari file ini di seluruh aplikasi.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Database Types ────────────────────────────────────────────────────────────

export interface DbEvent {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_date: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbGuest {
  id: string;
  event_id: string;
  invitation_id: string;
  name: string;
  institution: string;
  position: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAttendance {
  id: string;
  guest_id: string;
  event_id: string;
  checkin_time: string;
  method: 'qr' | 'manual';
  status: 'hadir' | 'tidak_hadir';
  notes: string | null;
  checked_by: string | null;
  created_at: string;
}

export interface DbGuestAttendanceView {
  guest_id: string;
  event_id: string;
  invitation_id: string;
  name: string;
  institution: string;
  position: string;
  phone: string | null;
  guest_notes: string | null;
  guest_created_at: string;
  attendance_id: string | null;
  checkin_time: string | null;
  method: 'qr' | 'manual' | null;
  status: 'hadir' | 'tidak_hadir' | null;
  attendance_notes: string | null;
  is_present: boolean;
}

export interface DbAttendanceStats {
  event_id: string;
  event_name: string;
  total_guests: number;
  total_hadir: number;
  total_belum_hadir: number;
}

// ─── Database Schema Type ──────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      events: {
        Row: DbEvent;
        Insert: Omit<DbEvent, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<DbEvent, 'id' | 'created_at'>>;
      };
      guests: {
        Row: DbGuest;
        Insert: Omit<DbGuest, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<DbGuest, 'id' | 'created_at'>>;
      };
      attendance: {
        Row: DbAttendance;
        Insert: Omit<DbAttendance, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<DbAttendance, 'id' | 'created_at'>>;
      };
    };
    Views: {
      v_guest_attendance: { Row: DbGuestAttendanceView };
      v_attendance_stats: { Row: DbAttendanceStats };
    };
  };
};

// ─── Singleton Client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Supabase URL atau ANON KEY belum diisi di .env.local\n' +
    'Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Aplikasi ini tidak pakai Supabase Auth
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/** ID Event aktif MAPSI XXVII 2026 (sesuai seed migration) */
export const ACTIVE_EVENT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
