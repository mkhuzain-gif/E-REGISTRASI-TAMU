'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStore, DEFAULT_EVENT_SETTINGS } from '@/lib/store';
import { Eye, EyeOff, LogIn, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn, eventSettings } = useStore();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Derived dari eventSettings (dengan fallback ke logo asli / icon)
  const settings  = eventSettings || DEFAULT_EVENT_SETTINGS;
  const logoSrc   = settings.logoUrl || '/icon-512x512.png';
  const eventName = settings.name || 'E-REGISTRASI MAPSI XXVII';
  const eventSub  = settings.location
    ? `${settings.name} · ${settings.location}`
    : 'MAPSI Tingkat Kecamatan Kedungtuban';
  const badgeText = `${settings.name} • ${settings.year || 2026}`;

  useEffect(() => {
    if (isLoggedIn) router.replace('/dashboard');
  }, [isLoggedIn, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) { setError('Masukkan PIN Admin terlebih dahulu.'); return; }
    setLoading(true);
    setError('');
    const ok = await login(pin);
    if (ok) {
      router.replace('/dashboard');
    } else {
      setError('PIN yang Anda masukkan salah. Silakan coba lagi.');
      setPin('');
    }
    setLoading(false);
  };

  return (
    <main className="fixed inset-0 overflow-hidden flex items-center justify-center p-3 sm:p-4 select-none">

      {/* ── Background gradient ── */}
      <div className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, #022c22 0%, #064e3b 30%, #065f46 60%, #047857 85%, #059669 100%)',
        }}
      />

      {/* Isometric grid overlay */}
      <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(60deg, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(-60deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px, 50px 50px, 60px 60px, 60px 60px',
        }}
      />

      {/* Floating glow orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }} />
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)' }} />

      {/* ── Main Login Panel ── */}
      <div className="w-full max-w-sm sm:max-w-md animate-bounce-in flex flex-col my-auto">

        {/* Logo + Header Card */}
        <div className="relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '16px 16px 0 0',
            borderBottom: '1px solid rgba(5,150,105,0.12)',
            padding: '1.75rem 1.75rem 1.25rem',
          }}>

          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5"
            style={{ background: 'linear-gradient(90deg, #059669, #34d399, #059669)' }} />

          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden relative"
                style={{
                  boxShadow: '0 8px 28px rgba(5,150,105,0.22), 0 2px 8px rgba(5,150,105,0.12)',
                  border: '2.5px solid rgba(5,150,105,0.15)',
                }}>
                <Image
                  src={logoSrc}
                  alt={`Logo ${eventName}`}
                  width={112}
                  height={112}
                  className="object-contain w-full h-full bg-white p-1"
                  priority
                  unoptimized={logoSrc.startsWith('data:')}
                />
              </div>
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: '0 0 0 5px rgba(5,150,105,0.06)' }} />
            </div>

            <h1 className="text-xl sm:text-2xl font-black leading-tight truncate max-w-full"
              style={{ color: '#064e3b', letterSpacing: '-0.02em' }}>
              {eventName}
            </h1>
            <p className="text-xs sm:text-sm font-semibold mt-1 truncate max-w-full" style={{ color: '#059669' }}>
              {eventSub}
            </p>
            <div className="flex items-center gap-2.5 mt-2.5 w-full">
              <div className="h-px flex-1" style={{ background: 'rgba(5,150,105,0.2)' }} />
              <span className="text-[11px] sm:text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                {badgeText}
              </span>
              <div className="h-px flex-1" style={{ background: 'rgba(5,150,105,0.2)' }} />
            </div>
          </div>
        </div>

        {/* Login Form Card */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: '0 0 16px 16px',
          padding: '1.25rem 1.75rem 1.75rem',
          boxShadow: '0 20px 50px rgba(2,44,34,0.3), 0 6px 20px rgba(2,44,34,0.15)',
        }}>
          {/* Form header */}
          <div className="flex items-center gap-2.5 mb-3.5 pb-2.5"
            style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <Lock size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm" style={{ color: '#064e3b' }}>Login Admin Panitia</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label htmlFor="pin-input"
                className="block text-[11px] font-bold mb-1 uppercase tracking-wider"
                style={{ color: '#065f46' }}>
                PIN Admin
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan PIN"
                  className="neo-input pr-11 text-sm h-11"
                  maxLength={20}
                  autoComplete="current-password"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1"
                  style={{ color: 'rgba(6,78,59,0.45)' }}
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs animate-slide-in"
                style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                <span className="text-sm">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading || !pin}
              className="neo-btn neo-btn-primary w-full py-2.5 sm:py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '10px', fontSize: '0.9rem', letterSpacing: '0.01em' }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  Masuk Dashboard
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] sm:text-xs mt-3.5 font-medium"
          style={{ color: 'rgba(209,250,229,0.75)' }}>
          Sistem Absensi Digital MAPSI 2026 · Kecamatan Kedungtuban
        </p>
      </div>
    </main>
  );
}
