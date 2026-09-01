'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStore, DEFAULT_EVENT_SETTINGS } from '@/lib/store';
import {
  Eye,
  EyeOff,
  LogIn,
  Lock,
  ShieldCheck,
  QrCode,
  BarChart3,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn, eventSettings } = useStore();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Event settings derived with fallback
  const settings = eventSettings || DEFAULT_EVENT_SETTINGS;
  const logoSrc = settings.logoUrl || '/icon-512x512.png';
  const eventName = settings.name || 'E-REGISTRASI MAPSI XXVII';
  const eventSub = settings.location
    ? `${settings.location}`
    : 'Kecamatan Kedungtuban, Kabupaten Blora';
  const eventYear = settings.year || 2026;

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/dashboard');
    }
  }, [isLoggedIn, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Masukkan PIN Admin terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError('');
    const ok = await login(pin);
    if (ok) {
      router.replace('/dashboard');
    } else {
      setError('PIN otorisasi salah. Silakan periksa kembali PIN Anda.');
      setPin('');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen w-full relative overflow-hidden bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans select-none">
      {/* ── Background Mesh & Ambient Glows ── */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(5, 150, 105, 0.45), transparent 70%), radial-gradient(circle at 100% 100%, rgba(6, 78, 59, 0.6), transparent 50%), radial-gradient(circle at 0% 50%, rgba(16, 185, 129, 0.2), transparent 45%), #021a13',
        }}
      />

      {/* Modern Subtle Isometric & Dot Grid Overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(rgba(52, 211, 153, 0.3) 1px, transparent 1px),
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px, 64px 64px, 64px 64px',
        }}
      />

      {/* Decorative Floating Glow Spheres */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-40 animate-pulse"
        style={{ background: 'rgba(16, 185, 129, 0.3)' }}
      />
      <div
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-30 animate-pulse"
        style={{ background: 'rgba(5, 150, 105, 0.3)', animationDuration: '4s' }}
      />

      {/* ── Main Executive Container ── */}
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden border border-emerald-500/20 bg-slate-900/75 backdrop-blur-2xl shadow-[0_25px_70px_-15px_rgba(2,44,34,0.9),0_0_50px_rgba(5,150,105,0.2)] grid grid-cols-1 lg:grid-cols-12 relative z-10 animate-bounce-in">
        
        {/* Top Accent Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-600 z-20" />

        {/* ════════════════════════════════════════════════════════════════
            LEFT COLUMN: Brand & Event Prestige Showcase
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-emerald-950/80 via-slate-950/70 to-emerald-950/60 border-b lg:border-b-0 lg:border-r border-emerald-500/15">
          
          {/* Subtle Islamic / Geometric Watermark Accent in Corner */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full border border-emerald-500/10 pointer-events-none opacity-40" />
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 rounded-full border border-emerald-400/10 pointer-events-none opacity-30" />

          {/* Top Brand Bar */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Sistem Registrasi & Presensi Resmi</span>
              </div>
              <span className="text-xs font-bold text-emerald-400/60 uppercase tracking-widest hidden sm:inline-block">
                • MAPSI {eventYear}
              </span>
            </div>

            {/* Logo + Hero Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 mb-6">
              <div className="relative group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-2 flex items-center justify-center shadow-xl shadow-emerald-950/50 border-2 border-emerald-400/40 relative z-10 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={logoSrc}
                    alt={`Logo ${eventName}`}
                    width={96}
                    height={96}
                    className="object-contain w-full h-full"
                    priority
                    unoptimized={logoSrc.startsWith('data:')}
                  />
                </div>
                {/* Backlight glow */}
                <div className="absolute -inset-1 rounded-2xl bg-emerald-500/30 blur-md -z-10 group-hover:bg-emerald-400/40 transition-colors" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {eventName}
                </h1>
                <p className="text-sm font-medium text-emerald-300/90 mt-1">
                  {eventSub}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-600/30">
                  <Sparkles size={12} className="text-emerald-400" />
                  KORWIL BINDIK & KKG PAI KEDUNGTUBAN
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed mb-6">
              Platform administrasi terpadu untuk pencatatan kehadiran, manajemen undangan digital berbasis QR Code, dan pelaporan SPJ otomatis pada Musabaqah MAPSI.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2 text-emerald-400">
                  <QrCode size={18} />
                </div>
                <h2 className="text-xs font-bold text-white">Presensi QR</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Scan cepat & instan</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2 text-emerald-400">
                  <Users size={18} />
                </div>
                <h2 className="text-xs font-bold text-white">Data Undangan</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Impor Excel & cetak F4</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2 text-emerald-400">
                  <BarChart3 size={18} />
                </div>
                <h2 className="text-xs font-bold text-white">Rekap & SPJ</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Laporan PDF siap cetak</p>
              </div>
            </div>
          </div>

          {/* Bottom Security / Status Note */}
          <div className="pt-4 border-t border-emerald-500/15 flex items-center justify-between text-[11px] text-emerald-400/80">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Koneksi Database Cloud Aktif</span>
            </div>
            <span className="text-slate-400">v2.4 Pro Edition</span>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT COLUMN: Modern Authentication Box
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white relative">
          
          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-3">
              <Lock size={12} className="text-emerald-600" />
              <span>Autentikasi Panitia</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Masuk Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Masukkan PIN Admin untuk mengakses kendali registrasi dan presensi tamu.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="pin-input"
                  className="block text-xs font-extrabold uppercase tracking-wider text-slate-700"
                >
                  PIN Akses Admin
                </label>
                <span className="text-[11px] text-emerald-700 font-medium">
                  Terkunci & Aman
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck size={18} className="text-emerald-600" />
                </div>

                <input
                  id="pin-input"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan 6-8 digit PIN"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-semibold tracking-wider text-sm rounded-xl border-2 border-slate-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal shadow-sm"
                  maxLength={20}
                  autoComplete="current-password"
                  disabled={loading}
                  autoFocus
                />

                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-slide-in">
                <span className="text-base leading-none">⚠️</span>
                <span className="flex-1 leading-snug">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-login"
              type="submit"
              disabled={loading || !pin}
              className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-lg shadow-emerald-700/25 hover:shadow-emerald-700/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-600 disabled:hover:to-teal-700"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Otorisasi...</span>
                </>
              ) : (
                <>
                  <span>Buka Dashboard Registrasi</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </form>

          {/* Security Guarantee Footer */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col items-center text-center gap-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Enkripsi PIN 256-Bit • Supabase Cloud Verified</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Hak Cipta © {eventYear} Panitia MAPSI Kecamatan Kedungtuban
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
