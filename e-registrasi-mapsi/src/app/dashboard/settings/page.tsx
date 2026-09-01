'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import {
  Settings, Save, Key, Calendar, MapPin, FileText,
  Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff,
} from 'lucide-react';

export default function SettingsPage() {
  const { eventSettings, saveEventSettings, changeAdminPin, loadEventSettings } = useStore();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    eventDate: '',
    logoUrl: '',
  });
  const [pin, setPin]           = useState({ current: '', newPin: '', confirm: '' });
  const [showPin, setShowPin]   = useState({ current: false, newPin: false, confirm: false });

  const [savingEvent, setSavingEvent] = useState(false);
  const [savingPin,   setSavingPin]   = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const [eventMsg, setEventMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinMsg,   setPinMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Sync form dari store ────────────────────────────────────────────────────
  useEffect(() => {
    if (eventSettings) {
      setForm({
        name:        eventSettings.name        ?? '',
        description: eventSettings.description ?? '',
        location:    eventSettings.location    ?? '',
        eventDate:   eventSettings.eventDate   ? eventSettings.eventDate.split('T')[0] : '',
        logoUrl:     eventSettings.logoUrl     ?? '',
      });
    }
  }, [eventSettings]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const field = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pinField = (key: keyof typeof pin, value: string) =>
    setPin((prev) => ({ ...prev, [key]: value }));

  const showMsg = (
    setter: typeof setEventMsg,
    type: 'success' | 'error',
    text: string
  ) => {
    setter({ type, text });
    setTimeout(() => setter(null), 4000);
  };

  // ── Submit Event Settings ──────────────────────────────────────────────────
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEvent(true);
    setEventMsg(null);
    try {
      await saveEventSettings({
        name:        form.name.trim(),
        description: form.description.trim(),
        location:    form.location.trim(),
        logoUrl:     form.logoUrl.trim(),
        eventDate:   form.eventDate || undefined,
      });
      showMsg(setEventMsg, 'success', 'Pengaturan acara berhasil disimpan!');
    } catch (err) {
      showMsg(setEventMsg, 'error', (err as Error).message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSavingEvent(false);
    }
  };

  // ── Submit PIN ─────────────────────────────────────────────────────────────
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);
    if (!pin.newPin.trim()) {
      showMsg(setPinMsg, 'error', 'PIN baru tidak boleh kosong.');
      return;
    }
    if (pin.newPin !== pin.confirm) {
      showMsg(setPinMsg, 'error', 'PIN baru dan konfirmasi tidak cocok.');
      return;
    }
    if (pin.newPin.length < 4) {
      showMsg(setPinMsg, 'error', 'PIN minimal 4 karakter.');
      return;
    }
    setSavingPin(true);
    try {
      await changeAdminPin(pin.newPin.trim());
      setPin({ current: '', newPin: '', confirm: '' });
      showMsg(setPinMsg, 'success', 'PIN admin berhasil diubah!');
    } catch (err) {
      showMsg(setPinMsg, 'error', (err as Error).message || 'Gagal mengubah PIN.');
    } finally {
      setSavingPin(false);
    }
  };

  // ── Reload settings ────────────────────────────────────────────────────────
  const handleReload = async () => {
    setLoadingReset(true);
    await loadEventSettings();
    setLoadingReset(false);
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#064e3b' }}>Pengaturan Acara</h2>
            <p className="text-xs" style={{ color: '#059669' }}>Konfigurasi ulang untuk tahun berikutnya</p>
          </div>
        </div>
        <button
          onClick={handleReload}
          disabled={loadingReset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}
          title="Muat ulang pengaturan dari database"
        >
          <RefreshCw size={14} className={loadingReset ? 'animate-spin' : ''} />
          Muat Ulang
        </button>
      </div>

      {/* ── Kartu: Informasi Acara ── */}
      <form onSubmit={handleSaveEvent}>
        <div className="neo-card space-y-5">
          {/* Card Header */}
          <div className="flex items-center gap-3 pb-4"
            style={{ borderBottom: '1px solid rgba(5,150,105,0.12)' }}>
            <FileText size={18} style={{ color: '#059669' }} />
            <h3 className="font-bold text-base" style={{ color: '#064e3b' }}>Informasi Acara</h3>
          </div>

          {/* Nama Acara */}
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
              Nama Acara
            </label>
            <input
              id="settings-event-name"
              type="text"
              value={form.name}
              onChange={(e) => field('name', e.target.value)}
              placeholder="Contoh: MAPSI XXVIII"
              className="neo-input"
              required
            />
            <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Tampil di sidebar dan header aplikasi</p>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
              Deskripsi / Subtitle
            </label>
            <input
              id="settings-event-desc"
              type="text"
              value={form.description}
              onChange={(e) => field('description', e.target.value)}
              placeholder="Contoh: MAPSI Tingkat Kecamatan Kedungtuban XXVIII · 2027"
              className="neo-input"
            />
            <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Tampil di header bar (kanan nama halaman)</p>
          </div>

          {/* Lokasi + Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                <MapPin size={11} className="inline mr-1" />Lokasi
              </label>
              <input
                id="settings-event-location"
                type="text"
                value={form.location}
                onChange={(e) => field('location', e.target.value)}
                placeholder="Kecamatan Kedungtuban"
                className="neo-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
                <Calendar size={11} className="inline mr-1" />Tanggal Acara
              </label>
              <input
                id="settings-event-date"
                type="date"
                value={form.eventDate}
                onChange={(e) => field('eventDate', e.target.value)}
                className="neo-input"
              />
            </div>
          </div>

          {/* URL Logo */}
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
              <ImageIcon size={11} className="inline mr-1" />URL Logo
            </label>
            <input
              id="settings-logo-url"
              type="url"
              value={form.logoUrl}
              onChange={(e) => field('logoUrl', e.target.value)}
              placeholder="https://contoh.com/logo.png"
              className="neo-input"
            />
            <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>
              Tempel URL gambar logo (.jpg/.png). Kosongkan untuk pakai logo default.
            </p>
            {/* Preview logo */}
            {form.logoUrl && (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border-2"
                  style={{ borderColor: '#6ee7b7' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logoUrl}
                    alt="Preview logo"
                    className="w-full h-full object-contain bg-white p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <p className="text-xs font-medium" style={{ color: '#059669' }}>Preview logo</p>
              </div>
            )}
          </div>

          {/* Feedback */}
          {eventMsg && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm animate-slide-in`}
              style={{
                background: eventMsg.type === 'success' ? '#d1fae5' : '#fef2f2',
                border: `1px solid ${eventMsg.type === 'success' ? '#34d399' : '#fca5a5'}`,
                color: eventMsg.type === 'success' ? '#065f46' : '#b91c1c',
              }}>
              {eventMsg.type === 'success'
                ? <CheckCircle2 size={16} />
                : <AlertCircle size={16} />}
              <span className="font-medium">{eventMsg.text}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="btn-save-event"
            type="submit"
            disabled={savingEvent}
            className="neo-btn neo-btn-primary w-full py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ borderRadius: '10px' }}
          >
            {savingEvent ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={16} />
                Simpan Pengaturan Acara
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Kartu: Ganti PIN ── */}
      <form onSubmit={handleSavePin}>
        <div className="neo-card space-y-5">
          {/* Card Header */}
          <div className="flex items-center gap-3 pb-4"
            style={{ borderBottom: '1px solid rgba(5,150,105,0.12)' }}>
            <Key size={18} style={{ color: '#059669' }} />
            <div>
              <h3 className="font-bold text-base" style={{ color: '#064e3b' }}>Ganti PIN Admin</h3>
              <p className="text-xs" style={{ color: '#6ee7b7' }}>Ganti password login panitia</p>
            </div>
          </div>

          {/* PIN baru */}
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
              PIN Baru
            </label>
            <div className="relative">
              <input
                id="settings-new-pin"
                type={showPin.newPin ? 'text' : 'password'}
                value={pin.newPin}
                onChange={(e) => pinField('newPin', e.target.value)}
                placeholder="Minimal 4 karakter"
                className="neo-input pr-11"
                maxLength={20}
              />
              <button type="button"
                onClick={() => setShowPin((v) => ({ ...v, newPin: !v.newPin }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(6,78,59,0.45)' }}
                aria-label="Toggle PIN baru">
                {showPin.newPin ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Konfirmasi PIN */}
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: '#065f46' }}>
              Konfirmasi PIN Baru
            </label>
            <div className="relative">
              <input
                id="settings-confirm-pin"
                type={showPin.confirm ? 'text' : 'password'}
                value={pin.confirm}
                onChange={(e) => pinField('confirm', e.target.value)}
                placeholder="Ulangi PIN baru"
                className="neo-input pr-11"
                maxLength={20}
              />
              <button type="button"
                onClick={() => setShowPin((v) => ({ ...v, confirm: !v.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(6,78,59,0.45)' }}
                aria-label="Toggle konfirmasi PIN">
                {showPin.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {/* Match indicator */}
            {pin.newPin && pin.confirm && (
              <p className="text-xs mt-1 font-medium"
                style={{ color: pin.newPin === pin.confirm ? '#059669' : '#ef4444' }}>
                {pin.newPin === pin.confirm ? '✓ PIN cocok' : '✗ PIN tidak cocok'}
              </p>
            )}
          </div>

          {/* Feedback */}
          {pinMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm animate-slide-in"
              style={{
                background: pinMsg.type === 'success' ? '#d1fae5' : '#fef2f2',
                border: `1px solid ${pinMsg.type === 'success' ? '#34d399' : '#fca5a5'}`,
                color: pinMsg.type === 'success' ? '#065f46' : '#b91c1c',
              }}>
              {pinMsg.type === 'success'
                ? <CheckCircle2 size={16} />
                : <AlertCircle size={16} />}
              <span className="font-medium">{pinMsg.text}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="btn-save-pin"
            type="submit"
            disabled={savingPin || !pin.newPin || pin.newPin !== pin.confirm}
            className="neo-btn neo-btn-primary w-full py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '10px' }}
          >
            {savingPin ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan PIN...
              </>
            ) : (
              <>
                <Key size={16} />
                Simpan PIN Baru
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info box */}
      <div className="rounded-xl p-4 text-sm"
        style={{ background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
        <p className="font-bold mb-1.5" style={{ color: '#065f46' }}>💡 Tips Penggunaan Tahun Depan</p>
        <ul className="space-y-1 text-xs" style={{ color: '#047857' }}>
          <li>• Ubah <strong>Nama Acara</strong> dan <strong>Tanggal</strong> sebelum acara dimulai</li>
          <li>• Upload logo baru via URL gambar yang sudah di-host (misal Imgur, Google Drive)</li>
          <li>• Ganti PIN Admin untuk keamanan setiap tahun</li>
          <li>• Data tamu lama tetap aman — hapus manual jika perlu reset</li>
        </ul>
      </div>
    </div>
  );
}
