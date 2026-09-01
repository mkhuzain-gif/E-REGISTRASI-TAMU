'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import {
  Upload, Save, Key, Calendar, MapPin,
  CheckCircle2, AlertCircle, Eye, EyeOff,
  Image as ImageIcon, User, Shield, Link as LinkIcon, X,
} from 'lucide-react';

type Tab = 'identity' | 'info' | 'security';

export default function SettingsPage() {
  const { eventSettings, saveEventSettings, changeAdminPin, loadEventSettings } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('identity');

  /* ── Form state ─────────────────────────────────────────── */
  const [form, setForm] = useState({
    name:        '',
    edition:     '',
    year:        '',
    location:    '',
    eventDate:   '',
    description: '',
    logoUrl:     '',   // actual value to save (base64 or URL)
    logoUrlInput:'',   // URL input field (hidden when base64)
  });
  const [logoPreview,    setLogoPreview]    = useState('/icon-512x512.png');
  const [logoFromFile,   setLogoFromFile]   = useState(false); // true = uploaded from file
  const [dragging,       setDragging]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const setField = (key: keyof typeof form, v: string) => setForm((p) => ({ ...p, [key]: v }));

  /* ── Sync dari store ─────────────────────────────────────── */
  useEffect(() => {
    if (eventSettings) {
      const parts   = (eventSettings.name || '').trim().split(' ');
      const edition = parts.length > 1 ? parts[parts.length - 1] : '';
      const baseName = parts.length > 1 ? parts.slice(0, -1).join(' ') : eventSettings.name;
      const isExternal = eventSettings.logoUrl && !eventSettings.logoUrl.startsWith('/') && !eventSettings.logoUrl.startsWith('data:');

      setForm({
        name:         baseName || '',
        edition:      edition  || '',
        year:         String(eventSettings.year || new Date().getFullYear()),
        location:     eventSettings.location    || '',
        eventDate:    eventSettings.eventDate   ? eventSettings.eventDate.split('T')[0] : '',
        description:  eventSettings.description || '',
        logoUrl:      eventSettings.logoUrl     || '',
        logoUrlInput: isExternal ? eventSettings.logoUrl : '',
      });
      setLogoPreview(eventSettings.logoUrl || '/icon-512x512.png');
      setLogoFromFile(eventSettings.logoUrl?.startsWith('data:') ?? false);
    }
  }, [eventSettings]);

  /* ── Logo upload (base64) ─────────────────────────────────── */
  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { flash(setMsg, 'error', 'Ukuran file maksimal 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      setForm((p) => ({ ...p, logoUrl: result, logoUrlInput: '' }));
      setLogoFromFile(true);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoPreview('/icon-512x512.png');
    setForm((p) => ({ ...p, logoUrl: '', logoUrlInput: '' }));
    setLogoFromFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  /* ── Submit identitas + info ─────────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const fullName = form.edition
        ? `${form.name.trim()} ${form.edition.trim()}`
        : form.name.trim();
      const desc = form.description.trim() ||
        `${fullName} · Kecamatan ${form.location || 'Kedungtuban'} · ${form.year}`;

      await saveEventSettings({
        name:      fullName,
        description: desc,
        location:  form.location.trim(),
        logoUrl:   form.logoUrl || logoPreview,
        eventDate: form.eventDate || undefined,
      });
      flash(setMsg, 'success', 'Pengaturan berhasil disimpan dan langsung aktif di seluruh aplikasi!');
    } catch (err) {
      flash(setMsg, 'error', (err as Error).message || 'Gagal menyimpan. Periksa koneksi atau izin database.');
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

  /* ── Derived preview values ──────────────────────────────── */
  const previewName = form.edition ? `${form.name} ${form.edition}`.trim() : form.name || 'Nama Acara';
  const previewSub  = form.edition && form.year ? `${form.edition} ${form.year}` : form.year || 'Edisi · Tahun';

  /* ── Tab config ──────────────────────────────────────────── */
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'identity', label: 'Identitas & Logo', icon: ImageIcon },
    { id: 'info',     label: 'Info Acara',        icon: Calendar  },
    { id: 'security', label: 'Keamanan',           icon: Shield    },
  ];

  const FeedbackBlock = ({ m }: { m: typeof msg }) =>
    m ? (
      <div className="flex items-center gap-2 p-3.5 rounded-xl text-sm"
        style={{
          background: m.type === 'success' ? '#d1fae5' : '#fef2f2',
          border:     `1px solid ${m.type === 'success' ? '#34d399' : '#fca5a5'}`,
          color:      m.type === 'success' ? '#065f46' : '#b91c1c',
        }}>
        {m.type === 'success' ? <CheckCircle2 size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
        <span className="font-medium">{m.text}</span>
      </div>
    ) : null;

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto pb-12">

      {/* Page header */}
      <div className="mb-7">
        <h2 className="text-2xl font-extrabold" style={{ color: '#064e3b' }}>Pengaturan</h2>
        <p className="text-sm mt-1" style={{ color: '#059669' }}>
          Ubah identitas acara setiap tahun — perubahan langsung aktif di seluruh aplikasi
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl mb-7"
        style={{ background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.12)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setActiveTab(id); setMsg(null); setPinMsg(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all"
            style={activeTab === id
              ? { background: 'white', color: '#064e3b', boxShadow: '0 2px 10px rgba(5,150,105,0.15)' }
              : { color: '#059669' }}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════ TAB: Identitas & Logo ════════════ */}
      {activeTab === 'identity' && (
        <form onSubmit={handleSave} className="space-y-6">

          {/* ROW 1: Logo upload (kiri) + Preview sidebar (kanan) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Kartu Logo Upload */}
            <div className="neo-card flex flex-col gap-5">
              <div className="flex items-center gap-3 pb-3"
                style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' }}>
                  <ImageIcon size={17} style={{ color: '#047857' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Logo Aplikasi</p>
                  <p className="text-xs" style={{ color: '#6ee7b7' }}>Tampil di sidebar dan halaman login</p>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-3 py-10 transition-all select-none flex-1"
                style={{
                  border:     `2px dashed ${dragging ? '#059669' : 'rgba(5,150,105,0.25)'}`,
                  background: dragging ? 'rgba(5,150,105,0.06)' : 'transparent',
                }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: '#d1fae5' }}>
                  <Upload size={22} style={{ color: '#059669' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: '#064e3b' }}>Klik atau Seret & Lepas</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6ee7b7' }}>PNG, JPG, SVG, WebP • Maks. 2 MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              {/* Status logo terupload */}
              {logoFromFile ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: '#d1fae5', border: '1px solid #34d399' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} style={{ color: '#059669' }} />
                    <span className="text-xs font-semibold" style={{ color: '#065f46' }}>Gambar telah diunggah dari file</span>
                  </div>
                  <button type="button" onClick={clearLogo}
                    className="p-0.5 rounded-full hover:opacity-70 transition-opacity"
                    style={{ color: '#059669' }} title="Hapus logo">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                    <LinkIcon size={10} className="inline mr-1" />Atau pakai URL Gambar
                  </label>
                  <input type="url" value={form.logoUrlInput}
                    onChange={(e) => {
                      setField('logoUrlInput', e.target.value);
                      setField('logoUrl', e.target.value);
                      if (e.target.value) setLogoPreview(e.target.value);
                      else setLogoPreview('/kkg-pai-logo.jpg');
                    }}
                    placeholder="https://contoh.com/logo.png"
                    className="neo-input text-sm" />
                </div>
              )}
            </div>

            {/* Preview sidebar */}
            <div className="neo-card flex flex-col gap-5">
              <div className="flex items-center gap-3 pb-3"
                style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                  <User size={17} style={{ color: '#b45309' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Nama & Identitas</p>
                  <p className="text-xs" style={{ color: '#6ee7b7' }}>Dapat diubah setiap tahun</p>
                </div>
              </div>

              {/* Nama */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                  Nama Aplikasi
                </label>
                <input id="settings-app-name" type="text" value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="MAPSI" className="neo-input" required />
                <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Tampil di sidebar baris pertama</p>
              </div>

              {/* Edisi + Tahun */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                    Edisi / Romawi
                  </label>
                  <input id="settings-edition" type="text" value={form.edition}
                    onChange={(e) => setField('edition', e.target.value)}
                    placeholder="XXVII" className="neo-input" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                    Tahun
                  </label>
                  <input id="settings-year" type="number" value={form.year}
                    onChange={(e) => setField('year', e.target.value)}
                    placeholder="2026" min="2020" max="2100" className="neo-input" />
                </div>
              </div>

              {/* Preview sidebar live */}
              <div className="rounded-2xl overflow-hidden mt-auto"
                style={{ border: '1px solid rgba(5,150,105,0.15)' }}>
                <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
                  style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
                  ◉ Preview Sidebar — Live
                </div>
                <div className="flex items-center gap-3 p-4"
                  style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)' }}>
                  <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ border: '2px solid rgba(255,255,255,0.2)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="preview"
                      className="w-full h-full object-contain bg-white p-0.5"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/icon-512x512.png'; }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-white text-sm leading-tight truncate">{previewName}</p>
                    <p className="text-xs font-medium" style={{ color: 'rgba(110,231,183,0.85)' }}>{previewSub}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <FeedbackBlock m={msg} />

          {/* Save button */}
          <button id="btn-save-identity" type="submit" disabled={saving}
            className="neo-btn neo-btn-primary w-full py-3.5 text-sm font-bold disabled:opacity-50"
            style={{ borderRadius: '12px' }}>
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
              : <><Save size={16} />Simpan &amp; Terapkan ke Seluruh Aplikasi</>}
          </button>
        </form>
      )}

      {/* ════════════ TAB: Info Acara ════════════ */}
      {activeTab === 'info' && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="neo-card space-y-5">
            <div className="flex items-center gap-3 pb-3"
              style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' }}>
                <Calendar size={17} style={{ color: '#047857' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Info Acara</p>
                <p className="text-xs" style={{ color: '#6ee7b7' }}>Lokasi, tanggal, dan deskripsi acara</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            className="neo-btn neo-btn-primary w-full py-3.5 text-sm font-bold disabled:opacity-50"
            style={{ borderRadius: '12px' }}>
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
              : <><Save size={16} />Simpan Info Acara</>}
          </button>
        </form>
      )}

      {/* ════════════ TAB: Keamanan ════════════ */}
      {activeTab === 'security' && (
        <form onSubmit={handleSavePin} className="space-y-6">
          <div className="neo-card space-y-5">
            <div className="flex items-center gap-3 pb-3"
              style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                <Shield size={17} style={{ color: '#b45309' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Keamanan &amp; Password</p>
                <p className="text-xs" style={{ color: '#6ee7b7' }}>Ganti PIN login panitia</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  <p className="text-xs mt-1.5 font-medium"
                    style={{ color: pin.newPin === pin.confirm ? '#059669' : '#ef4444' }}>
                    {pin.newPin === pin.confirm ? '✓ PIN cocok' : '✗ PIN tidak cocok'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl text-sm"
              style={{ background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.12)' }}>
              <p className="font-semibold mb-1" style={{ color: '#065f46' }}>⚠️ Perhatian</p>
              <p className="text-xs" style={{ color: '#059669' }}>
                Setelah PIN diubah, Anda harus login ulang menggunakan PIN baru. Pastikan PIN baru mudah diingat oleh panitia.
              </p>
            </div>
          </div>

          <FeedbackBlock m={pinMsg} />

          <button id="btn-save-pin" type="submit"
            disabled={savingPin || !pin.newPin || pin.newPin !== pin.confirm}
            className="neo-btn neo-btn-primary w-full py-3.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '12px' }}>
            {savingPin
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan PIN...</>
              : <><Key size={16} />Simpan PIN Baru</>}
          </button>
        </form>
      )}

      {/* Tips box */}
      <div className="mt-8 rounded-2xl p-5"
        style={{ background: '#ecfdf5', border: '1px solid rgba(52,211,153,0.3)' }}>
        <p className="font-bold mb-2" style={{ color: '#065f46' }}>💡 Tips Penggunaan Tahun Berikutnya</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            'Ubah Nama Acara, Edisi, dan Tahun di tab Identitas & Logo',
            'Upload logo baru langsung dari komputer — drag & drop atau klik area upload',
            'Ganti PIN Admin di tab Keamanan setiap tahun untuk menjaga keamanan',
            'Semua perubahan tersimpan ke database dan aktif secara real-time',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: '#047857' }}>
              <span className="flex-shrink-0 mt-0.5">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
