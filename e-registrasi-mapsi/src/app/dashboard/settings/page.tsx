'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import {
  Upload, Save, Key, Calendar, MapPin,
  CheckCircle2, AlertCircle, Eye, EyeOff,
  Image as ImageIcon, User, Shield, Link as LinkIcon, X, Settings,
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
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="settings-animate-in" style={{ marginBottom: '2rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #022c22 0%, #064e3b 40%, #047857 100%)',
          borderRadius: '20px',
          padding: '1.75rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative grid overlay */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.06,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
          }} />
          {/* Decorative glow */}
          <div style={{
            position: 'absolute', top: '-50%', right: '-10%',
            width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Settings size={18} style={{ color: '#34d399' }} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                  Pengaturan
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(167,243,208,0.7)', margin: 0, paddingLeft: '3rem' }}>
                Kelola identitas acara, informasi, dan keamanan aplikasi
              </p>
            </div>
            <div style={{
              background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: '10px', padding: '0.4rem 0.85rem',
              fontSize: '0.72rem', fontWeight: 700, color: '#34d399',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Tahun {form.year || new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────── */}
      <div className="settings-tab-bar settings-animate-in settings-animate-in-delay-1" style={{ marginBottom: '1.75rem' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => { setActiveTab(id); setMsg(null); setPinMsg(null); }}
            className={`settings-tab ${activeTab === id ? 'settings-tab-active' : ''}`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════ TAB: Identitas & Logo ════════════ */}
      {activeTab === 'identity' && (
        <form onSubmit={handleSave} className="settings-animate-in settings-animate-in-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── Logo Upload Card ── */}
            <div className="settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="settings-card-section-title">
                <div className="settings-icon-badge settings-icon-badge-green">
                  <ImageIcon size={18} style={{ color: '#047857' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#064e3b', margin: 0 }}>Logo Aplikasi</p>
                  <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0, marginTop: '0.15rem' }}>Tampil di sidebar dan halaman login</p>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`settings-dropzone ${dragging ? 'dragging' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', flex: 1 }}>
                <div className="settings-dropzone-icon">
                  <Upload size={24} style={{ color: '#059669' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#064e3b', margin: 0 }}>
                    Klik atau Seret & Lepas
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0, marginTop: '0.35rem' }}>
                    PNG, JPG, SVG, WebP • Maks. 2 MB
                  </p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>

              {/* Status logo terupload */}
              {logoFromFile ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #d1fae5, #ecfdf5)',
                  border: '1px solid rgba(52,211,153,0.4)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={15} style={{ color: '#059669' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46' }}>Gambar telah diunggah dari file</span>
                  </div>
                  <button type="button" onClick={clearLogo}
                    style={{ padding: '0.2rem', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#059669', display: 'flex' }}
                    title="Hapus logo">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <label className="settings-input-label">
                    <LinkIcon size={11} />Atau pakai URL Gambar
                  </label>
                  <input type="url" value={form.logoUrlInput}
                    onChange={(e) => {
                      setField('logoUrlInput', e.target.value);
                      setField('logoUrl', e.target.value);
                      if (e.target.value) setLogoPreview(e.target.value);
                      else setLogoPreview('/kkg-pai-logo.jpg');
                    }}
                    placeholder="https://contoh.com/logo.png"
                    className="settings-input" />
                </div>
              )}
            </div>

            {/* ── Nama & Identitas Card ── */}
            <div className="settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="settings-card-section-title">
                <div className="settings-icon-badge settings-icon-badge-amber">
                  <User size={18} style={{ color: '#b45309' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#064e3b', margin: 0 }}>Nama & Identitas</p>
                  <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0, marginTop: '0.15rem' }}>Dapat diubah setiap tahun</p>
                </div>
              </div>

              {/* Nama */}
              <div>
                <label className="settings-input-label">Nama Aplikasi</label>
                <input id="settings-app-name" type="text" value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="MAPSI" className="settings-input" required />
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0, marginTop: '0.35rem' }}>
                  Tampil di sidebar baris pertama
                </p>
              </div>

              {/* Edisi + Tahun */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="settings-input-label">Edisi / Romawi</label>
                  <input id="settings-edition" type="text" value={form.edition}
                    onChange={(e) => setField('edition', e.target.value)}
                    placeholder="XXVII" className="settings-input" />
                </div>
                <div>
                  <label className="settings-input-label">Tahun</label>
                  <input id="settings-year" type="number" value={form.year}
                    onChange={(e) => setField('year', e.target.value)}
                    placeholder="2026" min="2020" max="2100" className="settings-input" />
                </div>
              </div>

              {/* Preview sidebar live */}
              <div className="settings-preview-card" style={{ marginTop: 'auto' }}>
                <div className="settings-preview-header">
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#10b981', boxShadow: '0 0 8px #10b981',
                    display: 'inline-block',
                  }} />
                  Preview Sidebar — Live
                </div>
                <div className="settings-preview-body">
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    overflow: 'hidden', flexShrink: 0,
                    border: '2px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#ffffff', padding: '2px' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = '/icon-512x512.png'; }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.875rem', lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {previewName}
                    </p>
                    <p style={{ fontSize: '0.72rem', fontWeight: 500, color: 'rgba(167,243,208,0.8)', margin: 0, marginTop: '0.15rem' }}>
                      {previewSub}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <FeedbackBlock m={msg} />

          {/* Save button */}
          <button id="btn-save-identity" type="submit" disabled={saving} className="settings-save-btn">
            {saving
              ? <><span style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Menyimpan...</>
              : <><Save size={16} />Simpan &amp; Terapkan ke Seluruh Aplikasi</>}
          </button>
        </form>
      )}

      {/* ════════════ TAB: Info Acara ════════════ */}
      {activeTab === 'info' && (
        <form onSubmit={handleSave} className="settings-animate-in settings-animate-in-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="settings-card-section-title">
              <div className="settings-icon-badge settings-icon-badge-green">
                <Calendar size={18} style={{ color: '#047857' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#064e3b', margin: 0 }}>Info Acara</p>
                <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0, marginTop: '0.15rem' }}>Lokasi, tanggal, dan deskripsi acara</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="settings-input-label">
                  <MapPin size={11} />Lokasi / Kecamatan
                </label>
                <input id="settings-location" type="text" value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                  placeholder="Kecamatan Kedungtuban" className="settings-input" />
              </div>
              <div>
                <label className="settings-input-label">
                  <Calendar size={11} />Tanggal Acara
                </label>
                <input id="settings-event-date" type="date" value={form.eventDate}
                  onChange={(e) => setField('eventDate', e.target.value)}
                  className="settings-input" />
              </div>
            </div>

            <div>
              <label className="settings-input-label">Deskripsi (tampil di header bar)</label>
              <input id="settings-description" type="text" value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Kosongkan untuk generate otomatis"
                className="settings-input" />
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0, marginTop: '0.35rem' }}>
                Kosongkan untuk generate otomatis dari nama + lokasi + tahun
              </p>
            </div>
          </div>

          <FeedbackBlock m={msg} />

          <button id="btn-save-info" type="submit" disabled={saving} className="settings-save-btn">
            {saving
              ? <><span style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Menyimpan...</>
              : <><Save size={16} />Simpan Info Acara</>}
          </button>
        </form>
      )}

      {/* ════════════ TAB: Keamanan ════════════ */}
      {activeTab === 'security' && (
        <form onSubmit={handleSavePin} className="settings-animate-in settings-animate-in-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="settings-card-section-title">
              <div className="settings-icon-badge settings-icon-badge-amber">
                <Shield size={18} style={{ color: '#b45309' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#064e3b', margin: 0 }}>Keamanan &amp; Password</p>
                <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0, marginTop: '0.15rem' }}>Ganti PIN login panitia</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="settings-input-label">PIN Baru</label>
                <div style={{ position: 'relative' }}>
                  <input id="settings-new-pin"
                    type={showPin.newPin ? 'text' : 'password'}
                    value={pin.newPin}
                    onChange={(e) => setPin((p) => ({ ...p, newPin: e.target.value }))}
                    placeholder="Minimal 4 karakter"
                    className="settings-input" style={{ paddingRight: '2.75rem' }} maxLength={20} />
                  <button type="button"
                    onClick={() => setShowPin((v) => ({ ...v, newPin: !v.newPin }))}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(6,78,59,0.4)', display: 'flex', padding: '0.15rem',
                    }}>
                    {showPin.newPin ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="settings-input-label">Konfirmasi PIN Baru</label>
                <div style={{ position: 'relative' }}>
                  <input id="settings-confirm-pin"
                    type={showPin.confirm ? 'text' : 'password'}
                    value={pin.confirm}
                    onChange={(e) => setPin((p) => ({ ...p, confirm: e.target.value }))}
                    placeholder="Ulangi PIN baru"
                    className="settings-input" style={{ paddingRight: '2.75rem' }} maxLength={20} />
                  <button type="button"
                    onClick={() => setShowPin((v) => ({ ...v, confirm: !v.confirm }))}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(6,78,59,0.4)', display: 'flex', padding: '0.15rem',
                    }}>
                    {showPin.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {pin.newPin && pin.confirm && (
                  <p style={{
                    fontSize: '0.72rem', fontWeight: 600, margin: '0.4rem 0 0 0',
                    color: pin.newPin === pin.confirm ? '#059669' : '#ef4444',
                  }}>
                    {pin.newPin === pin.confirm ? '✓ PIN cocok' : '✗ PIN tidak cocok'}
                  </p>
                )}
              </div>
            </div>

            {/* Warning notice */}
            <div className="settings-notice settings-notice-warning">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.8rem', margin: 0, marginBottom: '0.2rem' }}>Perhatian</p>
                <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.85 }}>
                  Setelah PIN diubah, Anda harus login ulang menggunakan PIN baru. Pastikan PIN baru mudah diingat oleh panitia.
                </p>
              </div>
            </div>
          </div>

          <FeedbackBlock m={pinMsg} />

          <button id="btn-save-pin" type="submit"
            disabled={savingPin || !pin.newPin || pin.newPin !== pin.confirm}
            className="settings-save-btn">
            {savingPin
              ? <><span style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Menyimpan PIN...</>
              : <><Key size={16} />Simpan PIN Baru</>}
          </button>
        </form>
      )}

      {/* ── Tips Section ─────────────────────────────────────── */}
      <div className="settings-animate-in settings-animate-in-delay-3"
        style={{
          marginTop: '2rem', borderRadius: '18px', padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(236,253,245,0.8) 0%, rgba(209,250,229,0.4) 100%)',
          border: '1px solid rgba(52,211,153,0.2)',
          backdropFilter: 'blur(8px)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem',
          }}>💡</div>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#065f46', margin: 0 }}>
            Tips Penggunaan Tahun Berikutnya
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            'Ubah Nama Acara, Edisi, dan Tahun di tab Identitas & Logo',
            'Upload logo baru langsung dari komputer — drag & drop atau klik area upload',
            'Ganti PIN Admin di tab Keamanan setiap tahun untuk menjaga keamanan',
            'Semua perubahan tersimpan ke database dan aktif secara real-time',
          ].map((tip, i) => (
            <div key={i} className="settings-tip-card">
              <div className="settings-tip-number">{i + 1}</div>
              <span style={{ fontSize: '0.78rem', color: '#047857', lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
