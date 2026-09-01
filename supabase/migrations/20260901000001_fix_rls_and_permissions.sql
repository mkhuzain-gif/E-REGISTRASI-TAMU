-- ============================================================
--  Fix Row Level Security (RLS) Policies for Public Web App
--  Migration: 20260901000001_fix_rls_and_permissions.sql
-- ============================================================

-- 1. Tabel guests (Izinkan CRUD untuk anon/frontend)
DROP POLICY IF EXISTS "guests_select_authenticated" ON public.guests;
DROP POLICY IF EXISTS "guests_insert_authenticated" ON public.guests;
DROP POLICY IF EXISTS "guests_update_authenticated" ON public.guests;
DROP POLICY IF EXISTS "guests_delete_authenticated" ON public.guests;
DROP POLICY IF EXISTS "guests_select_anon"          ON public.guests;
DROP POLICY IF EXISTS "guests_all_anon"            ON public.guests;

CREATE POLICY "guests_all_anon"
  ON public.guests FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Tabel attendance (Izinkan CRUD untuk anon/frontend)
DROP POLICY IF EXISTS "attendance_select_authenticated" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_authenticated" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_anon"          ON public.attendance;
DROP POLICY IF EXISTS "attendance_update_service_role"  ON public.attendance;
DROP POLICY IF EXISTS "attendance_delete_service_role"  ON public.attendance;
DROP POLICY IF EXISTS "attendance_all_anon"            ON public.attendance;

CREATE POLICY "attendance_all_anon"
  ON public.attendance FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Tabel admin_settings (Izinkan baca dan update PIN)
DROP POLICY IF EXISTS "admin_settings_all_authenticated" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_select_anon"       ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_all_anon"          ON public.admin_settings;

CREATE POLICY "admin_settings_all_anon"
  ON public.admin_settings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Tabel events (Izinkan baca dan update)
DROP POLICY IF EXISTS "events_select_authenticated" ON public.events;
DROP POLICY IF EXISTS "events_all_service_role"     ON public.events;
DROP POLICY IF EXISTS "events_all_anon"             ON public.events;

CREATE POLICY "events_all_anon"
  ON public.events FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
