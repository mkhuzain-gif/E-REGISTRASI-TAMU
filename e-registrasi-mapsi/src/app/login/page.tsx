'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { Eye, EyeOff, LogIn, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useStore();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">

      {/* ── Animated emerald gradient background ── */}
      <div className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, #022c22 0%, #064e3b 30%, #065f46 60%, #047857 85%, #059669 100%)',
        }}
      />

      {/* Isometric grid overlay */}
      <div className="fixed inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(60deg, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(-60deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 60px 60px, 70px 70px, 70px 70px',
        }}
      />

      {/* Floating glow orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }} />
      <div className="fixed bottom-20 right-20 w-80 h-80 rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)' }} />

      {/* ── Main Login Panel ── */}
      <div className="w-full max-w-md animate-bounce-in">

        {/* Logo + Header Card */}
        <div className="relative mb-0 overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '16px 16px 0 0',
            borderBottom: '1px solid rgba(5,150,105,0.12)',
            padding: '2.5rem 2.5rem 2rem',
          }}>

          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, #059669, #34d399, #059669)' }} />

          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="w-32 h-32 rounded-2xl overflow-hidden relative"
                style={{
                  boxShadow: '0 8px 32px rgba(5,150,105,0.25), 0 2px 8px rgba(5,150,105,0.15)',
                  border: '3px solid rgba(5,150,105,0.15)',
                }}>
                <Image
                  src="/kkg-pai-logo.jpg"
                  alt="Logo KKG PAI Kecamatan Kedungtuban"
                  width={128}
                  height={128}
                  className="object-contain w-full h-full bg-white p-2"
                  priority
                />
              </div>
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: '0 0 0 6px rgba(5,150,105,0.06)', borderRadius: '16px' }} />
            </div>

            <h1 className="text-2xl font-extrabold leading-tight"
              style={{ color: '#064e3b', letterSpacing: '-0.02em' }}>
              E-Registrasi Tamu Undangan
            </h1>
            <p className="text-sm font-semibold mt-1" style={{ color: '#059669' }}>
              MAPSI Tingkat Kecamatan Kedungtuban
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="h-px flex-1" style={{ background: 'rgba(5,150,105,0.2)' }} />
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                KKG PAI • XXVII • 2026
              </span>
              <div className="h-px flex-1" style={{ background: 'rgba(5,150,105,0.2)' }} />
            </div>
          </div>
        </div>

        {/* Login Form Card */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: '0 0 16px 16px',
          padding: '1.75rem 2.5rem 2.5rem',
          boxShadow: '0 20px 60px rgba(2,44,34,0.35), 0 8px 24px rgba(2,44,34,0.2)',
        }}>
          {/* Form header */}
          <div className="flex items-center gap-3 mb-5 pb-4"
            style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <Lock size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: '#064e3b' }}>Login Admin Panitia</p>

            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="pin-input"
                className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                style={{ color: '#065f46' }}>
                PIN Admin
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder=""
                  className="neo-input pr-11"
                  maxLength={20}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(6,78,59,0.45)' }}
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm animate-slide-in"
                style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                <span className="text-base">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading || !pin}
              className="neo-btn neo-btn-primary w-full py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '10px', fontSize: '0.92rem', letterSpacing: '0.01em' }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Masuk Dashboard
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5 font-medium"
          style={{ color: 'rgba(209,250,229,0.6)' }}>
          Sistem Absensi Digital MAPSI 2026 · Kecamatan Kedungtuban
        </p>
      </div>
    </main>
  );
}
