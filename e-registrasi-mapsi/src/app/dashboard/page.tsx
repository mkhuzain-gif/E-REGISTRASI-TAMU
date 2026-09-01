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
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">

      {/* Welcome banner */}
      <div className="overflow-hidden rounded-xl relative"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          boxShadow: '0 8px 32px rgba(5,150,105,0.25)',
        }}>
        {/* Isometric lines */}
        <div className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: `linear-gradient(60deg, rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(-60deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />
        <div className="absolute right-0 top-0 w-48 h-full pointer-events-none opacity-10"
          style={{ background: 'radial-gradient(ellipse at right, rgba(52,211,153,0.6) 0%, transparent 70%)' }} />

        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold tracking-wider uppercase mb-1"
              style={{ color: 'rgba(110,231,183,0.8)' }}>Selamat Datang</p>
            <h2 className="text-white text-xl font-extrabold leading-tight"
              style={{ letterSpacing: '-0.02em' }}>
              Panitia MAPSI Kedungtuban 2026
            </h2>
            <p className="text-sm mt-1 font-medium" style={{ color: 'rgba(167,243,208,0.8)' }}>
              Pantau kehadiran tamu undangan secara real-time
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/scanner" id="btn-go-scanner"
              className="neo-btn neo-btn-white px-4 py-2 text-sm"
              style={{ borderRadius: '8px' }}>
              <QrCode size={15} style={{ color: '#059669' }} /> Scan QR
            </Link>
            <Link href="/dashboard/guests" id="btn-go-guests"
              className="neo-btn px-4 py-2 text-sm"
              style={{
                borderRadius: '8px', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
              }}>
              <Users size={15} /> Data Tamu
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ id, label, value, sub, icon: Icon, iconBg, shadow }) => (
          <div key={id} id={id} className="neo-card p-5 animate-slide-in"
            style={{ boxShadow: `0 4px 20px ${shadow}, 0 1px 4px rgba(5,150,105,0.05)` }}>
            <div className="stat-icon mb-3"
              style={{ background: iconBg, boxShadow: `0 4px 12px ${shadow}` }}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-3xl font-extrabold" style={{ color: '#064e3b', letterSpacing: '-0.03em' }}>{value}</p>
            <p className="font-bold text-sm mt-1" style={{ color: '#065f46' }}>{label}</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'rgba(5,150,105,0.6)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="neo-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={17} style={{ color: '#059669' }} />
            <span className="font-bold text-sm" style={{ color: '#064e3b' }}>Progress Kehadiran</span>
          </div>
          <span className="neo-badge neo-badge-green">{percentage}%</span>
        </div>
        <div className="w-full h-4 rounded-full overflow-hidden"
          style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.12)' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, #059669, #34d399)',
              boxShadow: percentage > 0 ? '0 0 10px rgba(16,185,129,0.4)' : 'none',
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1.5 font-medium"
          style={{ color: 'rgba(5,150,105,0.6)' }}>
          <span>0 tamu</span>
          <span>Target: {guests.length} tamu</span>
        </div>
      </div>

      {/* Latest check-ins */}
      <div className="neo-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(5,150,105,0.1)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
              <Clock size={15} className="text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: '#064e3b' }}>Check-in Terbaru</span>
          </div>
          <Link href="/dashboard/attendance" id="btn-view-all"
            className="neo-btn neo-btn-outline px-3 py-1.5 text-xs"
            style={{ borderRadius: '7px' }}>
            Lihat Semua <ArrowRight size={12} />
          </Link>
        </div>

        {latestCheckins.length === 0 ? (
          <div className="p-10 text-center" style={{ color: 'rgba(5,150,105,0.5)' }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'rgba(5,150,105,0.07)' }}>
              <QrCode size={26} style={{ color: 'rgba(5,150,105,0.4)' }} />
            </div>
            <p className="font-bold text-sm" style={{ color: '#065f46' }}>Belum ada check-in</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(5,150,105,0.5)' }}>
              Scan QR Code tamu untuk mulai absensi
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(5,150,105,0.07)' }}>
            {latestCheckins.map(({ record, guest }, idx) => (
              <div key={record.id}
                className="px-5 py-3.5 flex items-center gap-4 transition-colors animate-slide-in"
                style={{ animationDelay: `${idx * 0.06}s` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(5,150,105,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff' }}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: '#064e3b' }}>{guest!.name}</p>
                  <p className="text-xs truncate font-medium" style={{ color: 'rgba(5,150,105,0.7)' }}>
                    {guest!.institution}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="neo-badge neo-badge-green mb-1 block">HADIR</span>
                  <p className="text-xs font-medium" style={{ color: 'rgba(5,150,105,0.6)' }}>
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
