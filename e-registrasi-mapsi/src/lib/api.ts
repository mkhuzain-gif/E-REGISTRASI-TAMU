/**
 * API functions untuk E-Registrasi MAPSI 2026
 * Semua operasi database Supabase terpusat di sini.
 */

import { supabase, ACTIVE_EVENT_ID, type DbGuest, type DbAttendance } from '@/lib/supabase';

// ─── Admin PIN ────────────────────────────────────────────────────────────────

/** Ambil PIN admin dari tabel admin_settings di Supabase */
export async function fetchAdminPin(): Promise<string> {
  const { data, error } = await (supabase
    .from('admin_settings') as any)
    .select('admin_pin')
    .eq('event_id', ACTIVE_EVENT_ID)
    .single();
  if (error || !data) {
    console.warn('[fetchAdminPin] Gagal membaca PIN dari Supabase:', error?.message ?? 'no data');
    console.warn('[fetchAdminPin] Kemungkinan RLS policy belum dibuat untuk role anon. Fallback ke 123456.');
    return '123456'; // fallback default
  }
  console.log('[fetchAdminPin] PIN berhasil dimuat dari Supabase ✅');
  return (data as { admin_pin: string }).admin_pin;
}


// ─── Type Mappings ─────────────────────────────────────────────────────────────

/** Konversi DbGuest → format Guest yang dipakai komponen */
export function dbGuestToGuest(g: DbGuest) {
  return {
    id: g.id,
    invitationId: g.invitation_id,
    name: g.name,
    institution: g.institution,
    position: g.position,
    phone: g.phone ?? '',
    notes: g.notes ?? '',
    createdAt: g.created_at,
  };
}

/** Konversi DbAttendance → format AttendanceRecord yang dipakai komponen */
export function dbAttendanceToRecord(a: DbAttendance) {
  return {
    id: a.id,
    guestId: a.guest_id,
    checkinTime: a.checkin_time,
    method: a.method,
    status: a.status,
  };
}

// ─── Guests ───────────────────────────────────────────────────────────────────

/** Ambil semua tamu untuk event aktif */
export async function fetchGuests() {
  const { data, error } = await (supabase
    .from('guests') as any)
    .select('*')
    .eq('event_id', ACTIVE_EVENT_ID)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbGuest[]).map(dbGuestToGuest);
}

/** Ambil satu tamu berdasarkan ID */
export async function fetchGuestById(id: string) {
  const { data, error } = await (supabase
    .from('guests') as any)
    .select('*')
    .eq('id', id)
    .eq('event_id', ACTIVE_EVENT_ID)
    .single();
  if (error) throw error;
  return data ? dbGuestToGuest(data as DbGuest) : null;
}

/** Ambil tamu berdasarkan invitation_id (untuk verifikasi QR) */
export async function fetchGuestByInvitationId(invitationId: string) {
  if (!invitationId) return null;
  const { data, error } = await (supabase
    .from('guests') as any)
    .select('*')
    .ilike('invitation_id', invitationId.trim())
    .eq('event_id', ACTIVE_EVENT_ID)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? dbGuestToGuest(data as DbGuest) : null;
}

/** Cari tamu dengan berbagai kriteria (ID, invitation_id, atau nama) */
export async function findGuestByQuery(queryStr?: string, guestName?: string) {
  if (!queryStr && !guestName) return null;
  const cleanId = (queryStr || '').trim();
  const cleanName = (guestName || '').trim();

  // 1. Coba match ID (UUID)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) {
    const byId = await fetchGuestById(cleanId);
    if (byId) return byId;
  }

  // 2. Coba match invitation_id (case-insensitive ilike)
  if (cleanId) {
    const { data: byInv } = await (supabase.from('guests') as any)
      .select('*')
      .ilike('invitation_id', cleanId)
      .eq('event_id', ACTIVE_EVENT_ID)
      .maybeSingle();
    if (byInv) return dbGuestToGuest(byInv as DbGuest);
  }

  // 3. Coba match nama tamu jika ada di payload QR
  if (cleanName) {
    const { data: byName } = await (supabase.from('guests') as any)
      .select('*')
      .ilike('name', `%${cleanName}%`)
      .eq('event_id', ACTIVE_EVENT_ID)
      .maybeSingle();
    if (byName) return dbGuestToGuest(byName as DbGuest);
  }

  return null;
}

/** Tambah tamu baru */
export async function createGuest(input: {
  name: string;
  institution: string;
  position: string;
  phone?: string;
  notes?: string;
  invitationId: string;
}) {
  const { data, error } = await (supabase
    .from('guests') as any)
    .insert({
      event_id: ACTIVE_EVENT_ID,
      invitation_id: input.invitationId,
      name: input.name,
      institution: input.institution,
      position: input.position,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return dbGuestToGuest(data as DbGuest);
}

/** Tambah banyak tamu sekaligus (Bulk Insert dari Excel/CSV) */
export async function createBulkGuests(
  guestsInput: Array<{
    name: string;
    institution: string;
    position: string;
    phone?: string;
    notes?: string;
    invitationId: string;
  }>
) {
  if (!guestsInput || guestsInput.length === 0) return [];

  const rows = guestsInput.map((item) => ({
    event_id: ACTIVE_EVENT_ID,
    invitation_id: item.invitationId,
    name: item.name.trim(),
    institution: item.institution.trim(),
    position: item.position.trim(),
    phone: item.phone?.trim() || null,
    notes: item.notes?.trim() || null,
  }));

  const { data, error } = await (supabase
    .from('guests') as any)
    .insert(rows)
    .select();

  if (error) throw error;
  return ((data ?? []) as DbGuest[]).map(dbGuestToGuest);
}

/** Update data tamu */
export async function updateGuest(id: string, input: Partial<{
  name: string;
  institution: string;
  position: string;
  phone: string;
  notes: string;
}>) {
  const updatePayload: Record<string, unknown> = {};
  if (input.name        !== undefined) updatePayload.name        = input.name;
  if (input.institution !== undefined) updatePayload.institution = input.institution;
  if (input.position    !== undefined) updatePayload.position    = input.position;
  if (input.phone       !== undefined) updatePayload.phone       = input.phone || null;
  if (input.notes       !== undefined) updatePayload.notes       = input.notes || null;

  const { data, error } = await (supabase
    .from('guests') as any)
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return dbGuestToGuest(data as DbGuest);
}

/** Hapus tamu (cascade ke attendance) */
export async function deleteGuest(id: string) {
  const { error } = await (supabase
    .from('guests') as any)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

/** Ambil semua rekaman absensi event aktif */
export async function fetchAttendance() {
  const { data, error } = await (supabase
    .from('attendance') as any)
    .select('*')
    .eq('event_id', ACTIVE_EVENT_ID)
    .order('checkin_time', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DbAttendance[]).map(dbAttendanceToRecord);
}

/** Ambil rekaman absensi satu tamu */
export async function fetchAttendanceByGuest(guestId: string) {
  const { data, error } = await (supabase
    .from('attendance') as any)
    .select('*')
    .eq('guest_id', guestId)
    .eq('event_id', ACTIVE_EVENT_ID)
    .eq('status', 'hadir')
    .maybeSingle();
  if (error) throw error;
  return data ? dbAttendanceToRecord(data as DbAttendance) : undefined;
}

/** Check-in tamu (insert attendance record) */
export async function checkInGuest(
  guestId: string,
  method: 'qr' | 'manual'
): Promise<{ success: boolean; message: string; record?: ReturnType<typeof dbAttendanceToRecord> }> {
  // Cek apakah sudah hadir
  const existing = await fetchAttendanceByGuest(guestId);
  if (existing) {
    const { data: guestData } = await (supabase
      .from('guests') as any).select('name').eq('id', guestId).single();
    const name = (guestData as { name: string } | null)?.name ?? 'Tamu';
    const time = new Date(existing.checkinTime).toLocaleString('id-ID');
    return {
      success: false,
      message: `${name} sudah melakukan absensi pada ${time}.`,
    };
  }

  // Insert record baru
  const { data, error } = await (supabase
    .from('attendance') as any)
    .insert({
      guest_id: guestId,
      event_id: ACTIVE_EVENT_ID,
      method,
      status: 'hadir',
    })
    .select()
    .single();

  if (error) {
    // Constraint violation = sudah hadir (race condition)
    if (error.code === '23505') {
      return { success: false, message: 'Tamu sudah terdaftar hadir.' };
    }
    throw error;
  }

  const { data: guestData } = await (supabase
    .from('guests') as any).select('name').eq('id', guestId).single();

  return {
    success: true,
    message: `${(guestData as { name: string } | null)?.name ?? 'Tamu'} berhasil check-in!`,
    record: dbAttendanceToRecord(data as DbAttendance),
  };
}

/** Hapus semua rekaman absensi event aktif */
export async function clearAttendance() {
  const { error } = await (supabase
    .from('attendance') as any)
    .delete()
    .eq('event_id', ACTIVE_EVENT_ID);
  if (error) throw error;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/** Ambil statistik kehadiran dari view */
export async function fetchAttendanceStats() {
  const { data, error } = await (supabase
    .from('v_attendance_stats') as any)
    .select('*')
    .eq('event_id', ACTIVE_EVENT_ID)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as { total_guests: number; total_hadir: number; total_belum_hadir: number } ??
    { total_guests: 0, total_hadir: 0, total_belum_hadir: 0 };
}

// ─── Realtime subscription helpers ───────────────────────────────────────────

/** Subscribe ke perubahan tamu real-time */
export function subscribeGuests(onUpdate: () => void) {
  return supabase
    .channel('guests-changes')
    .on('postgres_changes' as any, {
      event: '*', schema: 'public', table: 'guests',
      filter: `event_id=eq.${ACTIVE_EVENT_ID}`,
    }, onUpdate)
    .subscribe();
}

/** Subscribe ke perubahan attendance real-time */
export function subscribeAttendance(onUpdate: () => void) {
  return supabase
    .channel('attendance-changes')
    .on('postgres_changes' as any, {
      event: '*', schema: 'public', table: 'attendance',
      filter: `event_id=eq.${ACTIVE_EVENT_ID}`,
    }, onUpdate)
    .subscribe();
}
