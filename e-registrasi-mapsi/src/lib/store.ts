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
  deleteBulkGuests as apiDeleteBulkGuests,
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
  deleteBulkGuests: (ids: string[]) => Promise<void>;
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

// ─── Constants & Cache ────────────────────────────────────────────────────────

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  name: 'E-REGISTRASI MAPSI XXVII',
  description: 'MAPSI Tingkat Kecamatan Kedungtuban XXVII · 2026',
  location: 'Kecamatan Kedungtuban, Kabupaten Blora',
  eventDate: '2026-09-01',
  logoUrl: '/icon-512x512.png',
  year: 2026,
};

const SETTINGS_STORAGE_KEY = 'e_registrasi_event_settings_v1';

export function getCachedEventSettings(): EventSettings {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_EVENT_SETTINGS,
            ...parsed,
            logoUrl: parsed.logoUrl || '/icon-512x512.png',
          };
        }
      }
    } catch {}
  }
  return DEFAULT_EVENT_SETTINGS;
}

export function setCachedEventSettings(settings: EventSettings) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  isLoggedIn: false,
  adminPin: '123456',

  // ── Event Settings ────────────────────────────────────────────────────────
  eventSettings: typeof window !== 'undefined' ? getCachedEventSettings() : DEFAULT_EVENT_SETTINGS,

  loadEventSettings: async () => {
    const data = await fetchEventSettings();
    if (data) {
      const year = data.event_date
        ? new Date(data.event_date).getFullYear()
        : 2026;
      const cached = getCachedEventSettings();
      // Prioritaskan logoUrl dari upload pengaturan / cache jika data di DB masih placeholder '/logo.jpg'
      const activeLogo = (data.logo_url && data.logo_url !== '/logo.jpg') 
        ? data.logo_url 
        : (cached.logoUrl || '/icon-512x512.png');

      const resolved: EventSettings = {
        name: data.name || cached.name,
        description: data.description ?? cached.description,
        location: data.location ?? cached.location,
        eventDate: data.event_date || cached.eventDate,
        logoUrl: activeLogo,
        year,
      };
      setCachedEventSettings(resolved);
      set({ eventSettings: resolved });
    }
  },

  saveEventSettings: async (input) => {
    const { eventSettings } = get();

    // ── 1. Optimistic update: langsung update state lokal ────────────────────
    //    Sidebar & login panel berubah SEKETIKA tanpa tunggu Supabase
    const newYear = input.eventDate
      ? new Date(input.eventDate).getFullYear()
      : eventSettings?.year ?? 2026;

    const optimistic: import('./store').EventSettings = {
      name:        input.name        ?? eventSettings?.name        ?? DEFAULT_EVENT_SETTINGS.name,
      description: input.description ?? eventSettings?.description ?? DEFAULT_EVENT_SETTINGS.description,
      location:    input.location    ?? eventSettings?.location    ?? DEFAULT_EVENT_SETTINGS.location,
      eventDate:   input.eventDate   ?? eventSettings?.eventDate   ?? DEFAULT_EVENT_SETTINGS.eventDate,
      logoUrl:     input.logoUrl     ?? eventSettings?.logoUrl     ?? DEFAULT_EVENT_SETTINGS.logoUrl,
      year:        newYear,
    };
    setCachedEventSettings(optimistic);
    set({ eventSettings: optimistic });

    // ── 2. Persist ke Supabase (background) ──────────────────────────────────
    const dbInput: Record<string, unknown> = {};
    if (input.name        !== undefined) dbInput.name        = input.name;
    if (input.description !== undefined) dbInput.description = input.description;
    if (input.location    !== undefined) dbInput.location    = input.location;
    if (input.logoUrl     !== undefined) dbInput.logo_url    = input.logoUrl;
    if (input.eventDate   !== undefined) dbInput.event_date  = input.eventDate;

    try {
      await apiUpdateEventSettings(dbInput as Parameters<typeof apiUpdateEventSettings>[0]);
    } catch (err) {
      console.warn('[saveEventSettings] Supabase update failed:', err);
      // Optimistic state tetap aktif meskipun Supabase gagal (sesi ini)
    }

    // ── 3. Reload dari Supabase untuk konfirmasi ──────────────────────────────
    try {
      const fresh = await fetchEventSettings();
      if (fresh) {
        const freshYear = fresh.event_date
          ? new Date(fresh.event_date).getFullYear()
          : optimistic.year;
        const activeLogo = (fresh.logo_url && fresh.logo_url !== '/logo.jpg')
          ? fresh.logo_url
          : optimistic.logoUrl;
        const freshSettings: import('./store').EventSettings = {
          name:        fresh.name || optimistic.name,
          description: fresh.description ?? optimistic.description,
          location:    fresh.location    ?? optimistic.location,
          eventDate:   fresh.event_date  || optimistic.eventDate,
          logoUrl:     activeLogo,
          year:        freshYear,
        };
        if (!input.name || fresh.name === input.name) {
          setCachedEventSettings(freshSettings);
          set({ eventSettings: freshSettings });
        }
      }
    } catch {
      // ignore — optimistic state sudah aktif
    }
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

  deleteBulkGuests: async (ids) => {
    if (!ids.length) return;
    await apiDeleteBulkGuests(ids);
    const idSet = new Set(ids);
    set((s) => ({
      guests: s.guests.filter((g) => !idSet.has(g.id)),
      attendance: s.attendance.filter((a) => !idSet.has(a.guestId)),
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
      let resolvedSettings = getCachedEventSettings();
      if (eventData) {
        const year = eventData.event_date
          ? new Date(eventData.event_date).getFullYear()
          : (resolvedSettings.year || 2026);
        const activeLogo = (eventData.logo_url && eventData.logo_url !== '/logo.jpg')
          ? eventData.logo_url
          : (resolvedSettings.logoUrl || '/icon-512x512.png');
        resolvedSettings = {
          name: eventData.name || resolvedSettings.name,
          description: eventData.description ?? resolvedSettings.description,
          location: eventData.location ?? resolvedSettings.location,
          eventDate: eventData.event_date || resolvedSettings.eventDate,
          logoUrl: activeLogo,
          year,
        };
        setCachedEventSettings(resolvedSettings);
      }
      set({ guests, attendance, adminPin, eventSettings: resolvedSettings, isLoading: false });
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
