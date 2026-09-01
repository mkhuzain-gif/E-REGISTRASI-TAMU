'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import {
  LayoutDashboard, Users, QrCode, ClipboardList,
  Download, LogOut, Menu, X,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',            label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/dashboard/guests',     label: 'Data Tamu',       icon: Users           },
  { href: '/dashboard/scanner',    label: 'Scanner QR',      icon: QrCode          },
  { href: '/dashboard/attendance', label: 'Riwayat Absensi', icon: ClipboardList   },
  { href: '/dashboard/export',     label: 'Ekspor Data',     icon: Download        },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, logout, guests, attendance } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) router.replace('/login');
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  const present = attendance.filter((a) => a.status === 'hadir').length;

  const handleLogout = () => { logout(); router.replace('/login'); };

  const activeLabel = navItems.find(
    (n) => n.href === pathname || (n.href !== '/dashboard' && pathname.startsWith(n.href))
  )?.label ?? 'E-Registrasi MAPSI';

  return (
    <div className="min-h-screen flex" style={{ background: '#f0fdf8' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={`
          fixed top-0 left-0 h-full w-64 z-40 flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        style={{
          background: 'linear-gradient(180deg, #022c22 0%, #064e3b 40%, #065f46 100%)',
          boxShadow: '4px 0 24px rgba(2,44,34,0.35)',
        }}
      >
        {/* Sidebar isometric grid */}
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Logo block */}
        <div className="relative p-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
            style={{ border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
            <Image src="/kkg-pai-logo.jpg" alt="KKG PAI" width={44} height={44}
              className="object-contain w-full h-full bg-white p-0.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-white text-sm leading-tight">MAPSI XXVII</p>
            <p className="text-xs font-medium" style={{ color: 'rgba(110,231,183,0.8)' }}>Kedungtuban 2026</p>
          </div>
          <button className="lg:hidden text-white/60 hover:text-white ml-auto"
            onClick={() => setSidebarOpen(false)} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Quick stats */}
        <div className="px-4 py-3 grid grid-cols-2 gap-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="rounded-lg p-2.5 text-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xl font-extrabold text-white">{guests.length}</p>
            <p className="text-xs font-medium" style={{ color: 'rgba(110,231,183,0.7)' }}>Undangan</p>
          </div>
          <div className="rounded-lg p-2.5 text-center"
            style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <p className="text-xl font-extrabold" style={{ color: '#34d399' }}>{present}</p>
            <p className="text-xs font-medium" style={{ color: 'rgba(110,231,183,0.7)' }}>Hadir</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-white/20'
                    : 'bg-white/8 group-hover:bg-white/12'
                }`}
                  style={{ background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)' }}>
                  <Icon size={16} className={isActive ? 'text-white' : 'text-emerald-300'} />
                </div>
                <span className="text-sm">{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-4 rounded-full flex-shrink-0"
                    style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button id="btn-logout" onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all"
            style={{ color: 'rgba(252,165,165,0.8)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
              e.currentTarget.style.color = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '';
              e.currentTarget.style.color = 'rgba(252,165,165,0.8)';
            }}
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 iso-bg">

        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-4 px-5 py-3.5"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(5,150,105,0.1)',
            boxShadow: '0 2px 16px rgba(5,150,105,0.08)',
          }}>
          <button className="lg:hidden transition-colors" style={{ color: '#064e3b' }}
            onClick={() => setSidebarOpen(true)} aria-label="Menu">
            <Menu size={22} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base leading-tight truncate"
              style={{ color: '#064e3b', letterSpacing: '-0.01em' }}>
              {activeLabel}
            </h1>
            <p className="text-xs font-medium hidden sm:block" style={{ color: '#059669' }}>
              MAPSI Tingkat Kecamatan Kedungtuban XXVII · 2026
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="neo-badge neo-badge-green hidden sm:inline-flex">
              {guests.length} Tamu
            </span>
            <span className="neo-badge hidden sm:inline-flex"
              style={{ background: '#d1fae5', color: '#065f46', borderColor: '#34d399' }}>
              ✓ {present} Hadir
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
