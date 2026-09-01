-- ============================================================
--  E-Registrasi Tamu Undangan – MAPSI XXVII Kedungtuban 2026
--  Migration: 20260901000000_init_schema.sql
--  Supabase PostgreSQL
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: events
-- Menyimpan informasi acara (agar sistem bisa digunakan ulang)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  description   TEXT,
  location      TEXT,
  event_date    DATE        NOT NULL,
  logo_url      TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.events IS
  'Informasi acara. Sistem dapat digunakan ulang untuk acara MAPSI berikutnya.';

-- ============================================================
-- TABLE: guests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guests (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invitation_id   TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  institution     TEXT        NOT NULL,
  position        TEXT        NOT NULL,
  phone           TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.guests IS
  'Data tamu undangan. invitation_id digunakan sebagai payload QR Code.';

CREATE INDEX IF NOT EXISTS idx_guests_event_id       ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_invitation_id  ON public.guests(invitation_id);
CREATE INDEX IF NOT EXISTS idx_guests_institution    ON public.guests(institution);

-- ============================================================
-- TABLE: attendance
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id      UUID        NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  event_id      UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checkin_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method        TEXT        NOT NULL CHECK (method IN ('qr', 'manual')),
  status        TEXT        NOT NULL DEFAULT 'hadir'
                              CHECK (status IN ('hadir', 'tidak_hadir')),
  notes         TEXT,
  checked_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.attendance IS
  'Rekaman absensi tamu. Satu tamu hanya boleh memiliki satu record status=hadir per event.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_guest_event_hadir
  ON public.attendance (guest_id, event_id)
  WHERE status = 'hadir';

CREATE INDEX IF NOT EXISTS idx_attendance_guest_id   ON public.attendance(guest_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id   ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkin    ON public.attendance(checkin_time DESC);

-- ============================================================
-- TABLE: admin_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID    NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  admin_pin   TEXT    NOT NULL DEFAULT '123456',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_settings IS
  'Pengaturan admin per acara.';

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings  ENABLE ROW LEVEL SECURITY;

-- events
CREATE POLICY "events_select_authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_all_service_role" ON public.events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- guests
CREATE POLICY "guests_select_authenticated" ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "guests_insert_authenticated" ON public.guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "guests_update_authenticated" ON public.guests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "guests_delete_authenticated" ON public.guests FOR DELETE TO authenticated USING (true);
CREATE POLICY "guests_select_anon"          ON public.guests FOR SELECT TO anon USING (true);

-- attendance
CREATE POLICY "attendance_select_authenticated" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert_authenticated" ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "attendance_insert_anon"          ON public.attendance FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "attendance_update_service_role"  ON public.attendance FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "attendance_delete_service_role"  ON public.attendance FOR DELETE TO service_role USING (true);

-- admin_settings
CREATE POLICY "admin_settings_all_authenticated" ON public.admin_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.v_attendance_stats AS
SELECT
  e.id                                          AS event_id,
  e.name                                        AS event_name,
  COUNT(g.id)                                   AS total_guests,
  COUNT(a.id) FILTER (WHERE a.status = 'hadir') AS total_hadir,
  COUNT(g.id) - COUNT(a.id)
    FILTER (WHERE a.status = 'hadir')           AS total_belum_hadir
FROM public.events e
LEFT JOIN public.guests     g ON g.event_id = e.id
LEFT JOIN public.attendance a ON a.guest_id = g.id AND a.event_id = e.id
GROUP BY e.id, e.name;

CREATE OR REPLACE VIEW public.v_guest_attendance AS
SELECT
  g.id                  AS guest_id,
  g.event_id,
  g.invitation_id,
  g.name,
  g.institution,
  g.position,
  g.phone,
  g.notes               AS guest_notes,
  g.created_at          AS guest_created_at,
  a.id                  AS attendance_id,
  a.checkin_time,
  a.method,
  a.status,
  a.notes               AS attendance_notes,
  CASE WHEN a.status = 'hadir' THEN TRUE ELSE FALSE END AS is_present
FROM public.guests g
LEFT JOIN public.attendance a ON a.guest_id = g.id AND a.status = 'hadir';

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO public.events (id, name, description, location, event_date, is_active)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Kompetisi MAPSI SD Tingkat Kecamatan Kedungtuban XXVII',
  'Kompetisi Mata Pelajaran Agama Islam dan Seni Islami Tingkat SD/MI se-Kecamatan Kedungtuban Tahun 2026',
  'Kecamatan Kedungtuban, Kabupaten Blora',
  '2026-09-20',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_settings (event_id, admin_pin)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '123456')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO public.guests (invitation_id, event_id, name, institution, position)
VALUES
  ('MAPSI-AA001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'H. Ahmad Fauzi, S.Pd',       'SDN Kedungtuban 01',           'Kepala Sekolah'),
  ('MAPSI-AA002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dra. Siti Aminah',            'SDN Kedungtuban 02',           'Kepala Sekolah'),
  ('MAPSI-AA003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Budi Santoso, S.Pd.I',        'MI Miftahul Huda',             'Kepala Madrasah'),
  ('MAPSI-AA004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Hj. Nur Laila, M.Pd',         'UPTD Dikpora Kec. Kedungtuban','Koordinator Dikpora'),
  ('MAPSI-AA005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Drs. Slamet Riyadi',          'KUA Kecamatan Kedungtuban',    'Kepala KUA'),
  ('MAPSI-AA006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Agus Prayitno, S.Ag',         'MWC NU Kedungtuban',           'Ketua MWC NU'),
  ('MAPSI-AA007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Fatimah Zahra, S.Pd.I',       'SDN Nglobo 01',                'Kepala Sekolah'),
  ('MAPSI-AA008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'M. Ridwan, S.Pd',             'SDN Nglobo 02',                'Kepala Sekolah')
ON CONFLICT (invitation_id) DO NOTHING;
