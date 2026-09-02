'use client';

import { useStore } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import {
  Users, UserCheck, UserX, QrCode, Clock,
  TrendingUp, ArrowRight, Activity,
} from 'lucide-react';

export default function DashboardPage() {
  const { guests, attendance } = useStore();

  const present = attendance.filter((a) => a.status === 'hadir');
  const absentCount = guests.length - present.length;
  const percentage = guests.length > 0 ? Math.round((present.length / guests.length) * 100) : 0;

  const latestCheckins = [...present]
    .sort((a, b) => new Date(b.checkinTime).getTime() - new Date(a.checkinTime).getTime())
    .slice(0, 5)
    .map((record) => ({ record, guest: guests.find((g) => g.id === record.guestId) }))
    .filter((e) => e.guest);

  const stats = [
    {
      id: 'stat-total', label: 'Total Undangan', value: guests.length, sub: 'tamu terdaftar',
      icon: Users, iconBg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', shadow: 'rgba(59,130,246,0.25)',
    },
    {
      id: 'stat-present', label: 'Sudah Hadir', value: present.length, sub: 'tamu hadir',
      icon: UserCheck, iconBg: 'linear-gradient(135deg,#059669,#047857)', shadow: 'rgba(5,150,105,0.25)',
    },
    {
      id: 'stat-absent', label: 'Belum Hadir', value: absentCount, sub: 'belum check-in',
      icon: UserX, iconBg: 'linear-gradient(135deg,#dc2626,#b91c1c)', shadow: 'rgba(220,38,38,0.2)',
    },
    {
      id: 'stat-percent', label: 'Kehadiran', value: `${percentage}%`, sub: 'dari total undangan',
      icon: TrendingUp, iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(245,158,11,0.25)',
    },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ── Welcome Banner ─────────────────────────────────── */}
      <div className="settings-animate-in dash-page-header">
        <div className="dash-page-header-grid" />
        <div className="dash-page-header-glow" />
        {/* Extra glow left */}
        <div style={{
          position: 'absolute', bottom: '-30%', left: '-5%',
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p style={{
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'rgba(110,231,183,0.8)', marginBottom: '0.3rem',
            }}>Selamat Datang</p>
            <h2 style={{
              color: '#ffffff', fontSize: '1.35rem', fontWeight: 800,
              letterSpacing: '-0.02em', lineHeight: 1.3, margin: 0,
            }}>
              Panitia MAPSI Kedungtuban 2026
            </h2>
            <p style={{ fontSize: '0.82rem', margin: '0.35rem 0 0 0', fontWeight: 500, color: 'rgba(167,243,208,0.75)' }}>
              Pantau kehadiran tamu undangan secara real-time
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/scanner" id="btn-go-scanner"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1rem', borderRadius: '10px',
                background: '#ffffff', color: '#064e3b',
                fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
              }}>
              <QrCode size={15} style={{ color: '#059669' }} /> Scan QR
            </Link>
            <Link href="/dashboard/guests" id="btn-go-guests"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.12)', color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}>
              <Users size={15} /> Data Tamu
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 settings-animate-in settings-animate-in-delay-1">
        {stats.map(({ id, label, value, sub, icon: Icon, iconBg, shadow }) => (
          <div key={id} id={id} className="dash-stat-card"
            style={{ '--stat-accent': iconBg } as React.CSSProperties}>
            <div className="dash-stat-icon"
              style={{ background: iconBg, boxShadow: `0 4px 12px ${shadow}` }}>
              <Icon size={20} className="text-white" />
            </div>
            <p style={{ fontSize: '1.85rem', fontWeight: 800, color: '#064e3b', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>{value}</p>
            <p style={{ fontWeight: 700, fontSize: '0.82rem', margin: '0.4rem 0 0 0', color: '#065f46' }}>{label}</p>
            <p style={{ fontSize: '0.7rem', margin: '0.2rem 0 0 0', fontWeight: 500, color: '#9ca3af' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Progress ───────────────────────────────────────── */}
      <div className="dash-section-card settings-animate-in settings-animate-in-delay-2" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={16} style={{ color: '#047857' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#064e3b' }}>Progress Kehadiran</span>
          </div>
          <span className="neo-badge neo-badge-green">{percentage}%</span>
        </div>
        <div style={{
          width: '100%', height: '10px', borderRadius: '99px', overflow: 'hidden',
          background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.1)',
        }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #059669, #10b981, #34d399)',
            boxShadow: percentage > 0 ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
            transition: 'width 0.7s ease-out',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9ca3af' }}>{present.length} tamu hadir</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9ca3af' }}>Target: {guests.length} tamu</span>
        </div>
      </div>

      {/* ── Latest Check-ins ───────────────────────────────── */}
      <div className="dash-section-card settings-animate-in settings-animate-in-delay-3">
        <div style={{
          padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(5,150,105,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #059669, #047857)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
            }}>
              <Clock size={15} className="text-white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#064e3b' }}>Check-in Terbaru</span>
          </div>
          <Link href="/dashboard/attendance" id="btn-view-all"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.35rem 0.75rem', borderRadius: '8px',
              fontSize: '0.75rem', fontWeight: 600,
              color: '#059669', border: '1.5px solid rgba(5,150,105,0.3)',
              textDecoration: 'none', transition: 'all 0.2s ease',
              background: 'transparent',
            }}>
            Lihat Semua <ArrowRight size={12} />
          </Link>
        </div>

        {latestCheckins.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(5,150,105,0.06), rgba(5,150,105,0.1))',
            }}>
              <QrCode size={26} style={{ color: 'rgba(5,150,105,0.35)' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#065f46', margin: 0 }}>Belum ada check-in</p>
            <p style={{ fontSize: '0.75rem', margin: '0.35rem 0 0 0', color: '#9ca3af' }}>
              Scan QR Code tamu untuk mulai absensi
            </p>
          </div>
        ) : (
          <div>
            {latestCheckins.map(({ record, guest }, idx) => (
              <div key={record.id}
                style={{
                  padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem',
                  borderBottom: idx < latestCheckins.length - 1 ? '1px solid rgba(5,150,105,0.06)' : 'none',
                  transition: 'background 0.15s ease', cursor: 'default',
                  animationDelay: `${idx * 0.06}s`,
                }}
                className="settings-animate-in"
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(5,150,105,0.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontWeight: 700, fontSize: '0.82rem',
                  background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff',
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, color: '#064e3b', margin: 0 }}>{guest!.name}</p>
                  <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#9ca3af', margin: 0, marginTop: '0.15rem' }}>
                    {guest!.institution}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className="neo-badge neo-badge-green" style={{ display: 'block', marginBottom: '0.25rem' }}>HADIR</span>
                  <p style={{ fontSize: '0.68rem', fontWeight: 500, color: '#9ca3af', margin: 0 }}>
                    {formatDateTime(record.checkinTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
