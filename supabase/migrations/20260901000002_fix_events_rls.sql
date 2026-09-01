-- ============================================================
--  Fix RLS: Izinkan anon UPDATE tabel events & admin_settings
--  Jalankan SQL ini di Supabase Dashboard → SQL Editor
--  Migration: 20260901000002_fix_events_rls.sql
-- ============================================================

-- Hapus policy lama yang hanya allow service_role
DROP POLICY IF EXISTS "events_select_authenticated" ON public.events;
DROP POLICY IF EXISTS "events_all_service_role"     ON public.events;
DROP POLICY IF EXISTS "events_all_anon"             ON public.events;

-- Buat policy baru: anon dan authenticated bisa SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "events_all_anon"
  ON public.events FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Pastikan admin_settings juga bisa diupdate anon (untuk ganti PIN)
DROP POLICY IF EXISTS "admin_settings_all_authenticated" ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_select_anon"       ON public.admin_settings;
DROP POLICY IF EXISTS "admin_settings_all_anon"          ON public.admin_settings;

CREATE POLICY "admin_settings_all_anon"
  ON public.admin_settings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
