/**
 * Zustand global store untuk E-Registrasi MAPSI 2026
 * Data di-sync dari Supabase. Store berfungsi sebagai local cache.
 */
'use client';

import { create } from 'zustand';
import { generateInvitationId } from '@/lib/utils';
import {
  fetchGuests,
  fetchAttendance,
  fetchGuestById,
  fetchGuestByInvitationId,
  fetchAttendanceByGuest,
  createGuest,
  updateGuest as apiUpdateGuest,
  deleteGuest as apiDeleteGuest,
  checkInGuest,
  clearAttendance as apiClearAttendance,
  subscribeGuests,
  subscribeAttendance,
  fetchAdminPin,
  fetchEventSettings,
  updateEventSettings as apiUpdateEventSettings,
  updateAdminPin,
} from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Guest {
  id: string;
  invitationId: string;
  name: string;
  institution: string;
  position: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  guestId: string;
  checkinTime: string;
  method: 'qr' | 'manual';
  status: 'hadir' | 'tidak_hadir';
}

export interface EventSettings {
  name: string;           // Nama acara: "MAPSI XXVII"
  description: string;    // Deskripsi: "MAPSI Tingkat Kecamatan Kedungtuban XXVII · 2026"
  location: string;       // Lokasi: "Kecamatan Kedungtuban"
  eventDate: string;      // Tanggal acara ISO string
  logoUrl: string;        // URL logo
  year: number;           // Tahun: 2026
}

export interface AppState {
  // Auth
  isLoggedIn: boolean;
  adminPin: string;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Event Settings
  eventSettings: EventSettings | null;
  loadEventSettings: () => Promise<void>;
  saveEventSettings: (data: Partial<EventSettings>) => Promise<void>;
  changeAdminPin: (newPin: string) => Promise<void>;

  // Guests (local cache dari Supabase)
  guests: Guest[];
  loadGuests: () => Promise<void>;
  addGuest: (data: Omit<Guest, 'id' | 'invitationId' | 'createdAt'>) => Promise<Guest>;
  addBulkGuests: (dataList: Array<Omit<Guest, 'id' | 'invitationId' | 'createdAt'>>) => Promise<Guest[]>;
  updateGuest: (id: string, data: Partial<Omit<Guest, 'id' | 'invitationId' | 'createdAt'>>) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
  getGuestById: (id: string) => Guest | undefined;
  getGuestByInvitationId: (invId: string) => Guest | undefined;

  // Attendance
  attendance: AttendanceRecord[];
  loadAttendance: () => Promise<void>;
  checkIn: (guestId: string, method: 'qr' | 'manual') => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;
  getAttendanceByGuest: (guestId: string) => AttendanceRecord | undefined;
  clearAttendance: () => Promise<void>;

  // Init & real-time
  initialize: () => Promise<void>;
  startRealtime: () => () => void;

  // Backup/Restore
  exportData: () => string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_PIN = '123456';

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  isLoggedIn: false,
  adminPin: '123456',

  // ── Event Settings ────────────────────────────────────────────────────────
  eventSettings: null,

  loadEventSettings: async () => {
    const data = await fetchEventSettings();
    if (data) {
      const year = data.event_date
        ? new Date(data.event_date).getFullYear()
        : 2026;
      set({
        eventSettings: {
          name: data.name,
          description: data.description ?? '',
          location: data.location ?? '',
          eventDate: data.event_date,
          logoUrl: data.logo_url ?? '/kkg-pai-logo.jpg',
          year,
        },
      });
    }
  },

  saveEventSettings: async (input) => {
    const dbInput: Record<string, unknown> = {};
    if (input.name        !== undefined) dbInput.name        = input.name;
    if (input.description !== undefined) dbInput.description = input.description;
    if (input.location    !== undefined) dbInput.location    = input.location;
    if (input.logoUrl     !== undefined) dbInput.logo_url    = input.logoUrl;
    if (input.eventDate   !== undefined) dbInput.event_date  = input.eventDate;
    await apiUpdateEventSettings(dbInput as Parameters<typeof apiUpdateEventSettings>[0]);
    // Reload setelah simpan
    await get().loadEventSettings();
  },

  changeAdminPin: async (newPin: string) => {
    await updateAdminPin(newPin);
    set({ adminPin: newPin });
  },

  login: async (pin: string) => {
    // Selalu bandingkan dengan PIN terbaru dari state (yang sudah di-fetch dari Supabase)
    const { adminPin } = get();
    if (pin === adminPin) {
      set({ isLoggedIn: true });
      return true;
    }
    // Jika gagal, coba fetch ulang PIN dari Supabase (antisipasi cache lama)
    const freshPin = await fetchAdminPin();
    set({ adminPin: freshPin });
    if (pin === freshPin) {
      set({ isLoggedIn: true });
      return true;
    }
    return false;
  },

  logout: () => set({ isLoggedIn: false }),

  // ── State ─────────────────────────────────────────────────────────────────
  isLoading: false,
  error: null,

  // ── Guests ────────────────────────────────────────────────────────────────
  guests: [],

  loadGuests: async () => {
    set({ isLoading: true, error: null });
    try {
      const guests = await fetchGuests();
      set({ guests, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addGuest: async (data) => {
    const invitationId = generateInvitationId();
    const newGuest = await createGuest({ ...data, invitationId });
    set((s) => ({ guests: [...s.guests, newGuest] }));
    return newGuest;
  },

  addBulkGuests: async (dataList) => {
    if (!dataList.length) return [];
    const items = dataList.map((d) => ({
      ...d,
      invitationId: generateInvitationId(),
    }));
    const newGuests = await (await import('@/lib/api')).createBulkGuests(items);
    set((s) => ({ guests: [...s.guests, ...newGuests] }));
    return newGuests;
  },

  updateGuest: async (id, data) => {
    const updated = await apiUpdateGuest(id, data);
    set((s) => ({
      guests: s.guests.map((g) => (g.id === id ? updated : g)),
    }));
  },

  deleteGuest: async (id) => {
    await apiDeleteGuest(id);
    set((s) => ({
      guests: s.guests.filter((g) => g.id !== id),
      attendance: s.attendance.filter((a) => a.guestId !== id),
    }));
  },

  getGuestById: (id) => get().guests.find((g) => g.id === id),

  getGuestByInvitationId: (invId) => {
    if (!invId) return undefined;
    const clean = invId.trim().toLowerCase();
    return get().guests.find(
      (g) =>
        g.invitationId.trim().toLowerCase() === clean ||
        g.id.trim().toLowerCase() === clean
    );
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  attendance: [],

  loadAttendance: async () => {
    try {
      const attendance = await fetchAttendance();
      set({ attendance });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  checkIn: async (guestId, method) => {
    const result = await checkInGuest(guestId, method);
    if (result.success && result.record) {
      set((s) => ({ attendance: [result.record!, ...s.attendance] }));
    }
    return result;
  },

  getAttendanceByGuest: (guestId) =>
    get().attendance.find((a) => a.guestId === guestId && a.status === 'hadir'),

  clearAttendance: async () => {
    await apiClearAttendance();
    set({ attendance: [] });
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  initialize: async () => {
    set({ isLoading: true });
    try {
      const [guests, attendance, adminPin, eventData] = await Promise.all([
        fetchGuests(),
        fetchAttendance(),
        fetchAdminPin(),
        fetchEventSettings(),
      ]);
      let eventSettings = null;
      if (eventData) {
        const year = eventData.event_date
          ? new Date(eventData.event_date).getFullYear()
          : 2026;
        eventSettings = {
          name: eventData.name,
          description: eventData.description ?? '',
          location: eventData.location ?? '',
          eventDate: eventData.event_date,
          logoUrl: eventData.logo_url ?? '/kkg-pai-logo.jpg',
          year,
        };
      }
      set({ guests, attendance, adminPin, eventSettings, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  /** Subscribe ke Supabase realtime. Kembalikan fungsi untuk unsubscribe. */
  startRealtime: () => {
    const guestSub = subscribeGuests(() => get().loadGuests());
    const attendanceSub = subscribeAttendance(() => get().loadAttendance());

    return () => {
      guestSub.unsubscribe();
      attendanceSub.unsubscribe();
    };
  },

  // ── Backup ────────────────────────────────────────────────────────────────
  exportData: () => {
    const { guests, attendance } = get();
    return JSON.stringify({ guests, attendance, exportedAt: new Date().toISOString() }, null, 2);
  },
}));
