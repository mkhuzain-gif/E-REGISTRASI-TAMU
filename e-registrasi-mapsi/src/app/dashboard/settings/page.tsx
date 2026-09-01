'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import {
  Upload, Save, Key, Calendar, MapPin,
  CheckCircle2, AlertCircle, Eye, EyeOff,
  Image as ImageIcon, User, Shield, Link as LinkIcon,
} from 'lucide-react';

type Tab = 'identity' | 'info' | 'security';

export default function SettingsPage() {
  const { eventSettings, saveEventSettings, changeAdminPin, loadEventSettings } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('identity');

  /* ── Form state ─────────────────────────────────────────── */
  const [form, setForm] = useState({
    name:        '',   // "MAPSI"
    edition:     '',   // "XXVII"
    year:        '',   // "2026"
    location:    '',
    eventDate:   '',
    description: '',
    logoUrl:     '',
  });
  const [logoPreview, setLogoPreview] = useState('/kkg-pai-logo.jpg');
  const [dragging, setDragging]       = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  /* ── Security ────────────────────────────────────────────── */
  const [pin, setPin]         = useState({ newPin: '', confirm: '' });
  const [showPin, setShowPin] = useState({ newPin: false, confirm: false });

  /* ── Feedback ───────────────────────────────────────────── */
  const [saving,    setSaving]    = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [msg,    setMsg]    = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ── Helpers ─────────────────────────────────────────────── */
  const flash = (setter: typeof setMsg, type: 'success' | 'error', text: string) => {
    setter({ type, text });
    setTimeout(() => setter(null), 4500);
  };

  const setField = (key: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [key]: v }));

  /* ── Sync dari store ─────────────────────────────────────── */
  useEffect(() => {
    if (eventSettings) {
      // Pisahkan nama dan edisi: misal "MAPSI XXVII" → name="MAPSI", edition="XXVII"
      const parts   = (eventSettings.name || '').trim().split(' ');
      const edition = parts.length > 1 ? parts[parts.length - 1] : '';
      const baseName = parts.length > 1 ? parts.slice(0, -1).join(' ') : eventSettings.name;

      setForm({
        name:        baseName || '',
        edition:     edition  || '',
        year:        String(eventSettings.year || new Date().getFullYear()),
        location:    eventSettings.location    || '',
        eventDate:   eventSettings.eventDate   ? eventSettings.eventDate.split('T')[0] : '',
        description: eventSettings.description || '',
        logoUrl:     eventSettings.logoUrl && !eventSettings.logoUrl.startsWith('/')
          ? eventSettings.logoUrl : '',
      });
      setLogoPreview(eventSettings.logoUrl || '/kkg-pai-logo.jpg');
    }
  }, [eventSettings]);

  /* ── Logo upload (base64) ─────────────────────────────────── */
  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      flash(setMsg, 'error', 'Ukuran file maksimal 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      setField('logoUrl', result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  /* ── Submit identitas + info ─────────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const fullName = form.edition
        ? `${form.name.trim()} ${form.edition.trim()}`
        : form.name.trim();

      const desc = form.description.trim() ||
        `${fullName} · Kecamatan ${form.location || 'Kedungtuban'} · ${form.year}`;

      await saveEventSettings({
        name:        fullName,
        description: desc,
        location:    form.location.trim(),
        logoUrl:     form.logoUrl || logoPreview,
        eventDate:   form.eventDate || undefined,
      });
      flash(setMsg, 'success', 'Pengaturan disimpan! Perubahan langsung aktif di seluruh aplikasi.');
    } catch (err) {
      flash(setMsg, 'error', (err as Error).message || 'Gagal menyimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Submit PIN ──────────────────────────────────────────── */
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.newPin.length < 4) { flash(setPinMsg, 'error', 'PIN minimal 4 karakter.'); return; }
    if (pin.newPin !== pin.confirm) { flash(setPinMsg, 'error', 'PIN tidak cocok.'); return; }
    setSavingPin(true);
    try {
      await changeAdminPin(pin.newPin.trim());
      setPin({ newPin: '', confirm: '' });
      flash(setPinMsg, 'success', 'PIN admin berhasil diubah!');
    } catch (err) {
      flash(setPinMsg, 'error', (err as Error).message || 'Gagal mengubah PIN.');
    } finally {
      setSavingPin(false);
    }
  };

  /* ── Live preview values ─────────────────────────────────── */
  const previewName = form.edition
    ? `${form.name} ${form.edition}`.trim()
    : form.name || 'Nama Acara';
  const previewSub  = form.edition && form.year
    ? `${form.edition} ${form.year}`
    : form.year || 'Edisi · Tahun';

  /* ── Tab config ──────────────────────────────────────────── */
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'identity', label: 'Identitas & Logo', icon: ImageIcon },
    { id: 'info',     label: 'Info Acara',        icon: Calendar  },
    { id: 'security', label: 'Keamanan',           icon: Shield    },
  ];

  /* ── Feedback block ──────────────────────────────────────── */
  const FeedbackBlock = ({ m }: { m: typeof msg }) =>
    m ? (
      <div className="flex items-center gap-2 p-3 rounded-xl text-sm animate-slide-in"
        style={{
          background: m.type === 'success' ? '#d1fae5' : '#fef2f2',
          border: `1px solid ${m.type === 'success' ? '#34d399' : '#fca5a5'}`,
          color:  m.type === 'success' ? '#065f46' : '#b91c1c',
        }}>
        {m.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
        <span className="font-medium">{m.text}</span>
      </div>
    ) : null;

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto pb-12">

      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold" style={{ color: '#064e3b' }}>Pengaturan</h2>
        <p className="text-sm mt-0.5" style={{ color: '#059669' }}>
          Ubah identitas acara setiap tahun — langsung aktif di seluruh aplikasi
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 p-1 rounded-2xl mb-6"
        style={{ background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.12)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveTab(id); setMsg(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all"
            style={activeTab === id ? {
              background: 'white',
              color: '#064e3b',
              boxShadow: '0 2px 10px rgba(5,150,105,0.15)',
            } : { color: '#059669' }}>
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ════════════ TAB: Identitas & Logo ════════════ */}
      {activeTab === 'identity' && (
        <form onSubmit={handleSave} className="space-y-5">

          {/* Kartu Logo */}
          <div className="neo-card">
            <div className="flex items-center gap-3 mb-5 pb-3"
              style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' }}>
                <ImageIcon size={17} style={{ color: '#047857' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Logo Aplikasi</p>
                <p className="text-xs" style={{ color: '#6ee7b7' }}>Tampil di sidebar dan halaman login</p>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-2.5 py-8 transition-all select-none"
                style={{
                  border: `2px dashed ${dragging ? '#059669' : 'rgba(5,150,105,0.25)'}`,
                  background: dragging ? 'rgba(5,150,105,0.06)' : 'transparent',
                }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: '#d1fae5' }}>
                  <Upload size={20} style={{ color: '#059669' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#064e3b' }}>Klik atau Seret & Lepas</p>
                <p className="text-xs" style={{ color: '#6ee7b7' }}>PNG, JPG, SVG, WebP • Maks. 2 MB</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              {/* Preview kotak kanan */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <div className="w-20 h-20 rounded-2xl overflow-hidden"
                  style={{ border: '2px solid rgba(5,150,105,0.2)', boxShadow: '0 4px 16px rgba(5,150,105,0.12)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo saat ini"
                    className="w-full h-full object-contain bg-white p-1"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/kkg-pai-logo.jpg'; }} />
                </div>
                <p className="text-xs font-medium" style={{ color: '#059669' }}>Saat ini</p>
              </div>
            </div>

            {/* URL fallback */}
            <div className="mt-4">
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                <LinkIcon size={10} className="inline mr-1" />Atau pakai URL Gambar
              </label>
              <input type="url" value={form.logoUrl}
                onChange={(e) => {
                  setField('logoUrl', e.target.value);
                  if (e.target.value) setLogoPreview(e.target.value);
                }}
                placeholder="https://contoh.com/logo.png"
                className="neo-input text-sm" />
            </div>
          </div>

          {/* Kartu Nama & Identitas */}
          <div className="neo-card space-y-4">
            <div className="flex items-center gap-3 pb-3"
              style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                <User size={17} style={{ color: '#b45309' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Nama & Identitas Aplikasi</p>
                <p className="text-xs" style={{ color: '#6ee7b7' }}>Dapat disesuaikan setiap tahun tanpa coding</p>
              </div>
            </div>

            {/* Nama Acara */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                Nama Aplikasi
              </label>
              <input id="settings-app-name" type="text" value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="MAPSI" className="neo-input" required />
              <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Nama utama di sidebar (baris pertama)</p>
            </div>

            {/* Edisi + Tahun */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                  Edisi / Angka Romawi
                </label>
                <input id="settings-edition" type="text" value={form.edition}
                  onChange={(e) => setField('edition', e.target.value)}
                  placeholder="XXVII" className="neo-input" />
                <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Angka edisi penyelenggaraan</p>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                  Tahun Pelaksanaan
                </label>
                <input id="settings-year" type="number" value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                  placeholder="2026" min="2020" max="2100" className="neo-input" />
                <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Tahun penyelenggaraan</p>
              </div>
            </div>

            {/* Subtitle otomatis */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                Subtitle Sidebar (otomatis)
              </label>
              <div className="neo-input text-sm select-none"
                style={{ background: 'rgba(5,150,105,0.04)', color: '#059669', cursor: 'default' }}>
                {previewSub}
              </div>
              <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Teks baris kedua di bawah nama di sidebar</p>
            </div>

            {/* ── Preview Sidebar Langsung ── */}
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(5,150,105,0.15)' }}>
              <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
                ◉ Preview Sidebar Logo — Live
              </div>
              <div className="flex items-center gap-3 p-4"
                style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)' }}>
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ border: '2px solid rgba(255,255,255,0.2)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="preview sidebar"
                    className="w-full h-full object-contain bg-white p-0.5"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/kkg-pai-logo.jpg'; }} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-white text-sm leading-tight truncate">{previewName}</p>
                  <p className="text-xs font-medium" style={{ color: 'rgba(110,231,183,0.85)' }}>{previewSub}</p>
                </div>
              </div>
            </div>
          </div>

          <FeedbackBlock m={msg} />

          <button id="btn-save-identity" type="submit" disabled={saving}
            className="neo-btn neo-btn-primary w-full py-3 text-sm font-bold disabled:opacity-50"
            style={{ borderRadius: '12px' }}>
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
              : <><Save size={16} />Simpan &amp; Terapkan</>}
          </button>
        </form>
      )}

      {/* ════════════ TAB: Info Acara ════════════ */}
      {activeTab === 'info' && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="neo-card space-y-4">
            <div className="flex items-center gap-3 pb-3"
              style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' }}>
                <Calendar size={17} style={{ color: '#047857' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Info Acara</p>
                <p className="text-xs" style={{ color: '#6ee7b7' }}>Lokasi, tanggal, dan deskripsi</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                <MapPin size={11} className="inline mr-1" />Lokasi / Kecamatan
              </label>
              <input id="settings-location" type="text" value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="Kecamatan Kedungtuban" className="neo-input" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                <Calendar size={11} className="inline mr-1" />Tanggal Acara
              </label>
              <input id="settings-event-date" type="date" value={form.eventDate}
                onChange={(e) => setField('eventDate', e.target.value)}
                className="neo-input" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                Deskripsi (tampil di header bar)
              </label>
              <input id="settings-description" type="text" value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Kosongkan untuk generate otomatis"
                className="neo-input" />
              <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Kosongkan untuk generate otomatis dari nama + lokasi + tahun</p>
            </div>
          </div>

          <FeedbackBlock m={msg} />

          <button id="btn-save-info" type="submit" disabled={saving}
            className="neo-btn neo-btn-primary w-full py-3 text-sm font-bold disabled:opacity-50"
            style={{ borderRadius: '12px' }}>
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
              : <><Save size={16} />Simpan Info Acara</>}
          </button>
        </form>
      )}

      {/* ════════════ TAB: Keamanan ════════════ */}
      {activeTab === 'security' && (
        <form onSubmit={handleSavePin} className="space-y-5">
          <div className="neo-card space-y-4">
            <div className="flex items-center gap-3 pb-3"
              style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                <Shield size={17} style={{ color: '#b45309' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Keamanan &amp; Password</p>
                <p className="text-xs" style={{ color: '#6ee7b7' }}>Ganti PIN login panitia</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>PIN Baru</label>
              <div className="relative">
                <input id="settings-new-pin"
                  type={showPin.newPin ? 'text' : 'password'}
                  value={pin.newPin}
                  onChange={(e) => setPin((p) => ({ ...p, newPin: e.target.value }))}
                  placeholder="Minimal 4 karakter"
                  className="neo-input pr-11" maxLength={20} />
                <button type="button"
                  onClick={() => setShowPin((v) => ({ ...v, newPin: !v.newPin }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(6,78,59,0.45)' }}>
                  {showPin.newPin ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>Konfirmasi PIN Baru</label>
              <div className="relative">
                <input id="settings-confirm-pin"
                  type={showPin.confirm ? 'text' : 'password'}
                  value={pin.confirm}
                  onChange={(e) => setPin((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Ulangi PIN baru"
                  className="neo-input pr-11" maxLength={20} />
                <button type="button"
                  onClick={() => setShowPin((v) => ({ ...v, confirm: !v.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(6,78,59,0.45)' }}>
                  {showPin.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {pin.newPin && pin.confirm && (
                <p className="text-xs mt-1 font-medium"
                  style={{ color: pin.newPin === pin.confirm ? '#059669' : '#ef4444' }}>
                  {pin.newPin === pin.confirm ? '✓ PIN cocok' : '✗ PIN tidak cocok'}
                </p>
              )}
            </div>
          </div>

          <FeedbackBlock m={pinMsg} />

          <button id="btn-save-pin" type="submit"
            disabled={savingPin || !pin.newPin || pin.newPin !== pin.confirm}
            className="neo-btn neo-btn-primary w-full py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '12px' }}>
            {savingPin
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan PIN...</>
              : <><Key size={16} />Simpan PIN Baru</>}
          </button>
        </form>
      )}

      {/* Tips box */}
      <div className="mt-6 rounded-2xl p-4 text-sm"
        style={{ background: '#ecfdf5', border: '1px solid rgba(52,211,153,0.3)' }}>
        <p className="font-bold mb-2" style={{ color: '#065f46' }}>💡 Tips untuk Tahun Berikutnya</p>
        <ul className="space-y-1 text-xs" style={{ color: '#047857' }}>
          <li>• Ubah <strong>Nama Acara</strong>, <strong>Edisi</strong>, dan <strong>Tahun</strong> di tab Identitas</li>
          <li>• Upload logo baru langsung dari komputer — drag & drop atau klik area upload</li>
          <li>• Ganti PIN Admin di tab Keamanan setiap tahun untuk menjaga keamanan</li>
          <li>• Semua perubahan tersimpan di database dan aktif secara real-time</li>
        </ul>
      </div>
    </div>
  );
}
