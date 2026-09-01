'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { formatDate, formatTime } from '@/lib/utils';
import {
  ClipboardList, Search, UserCheck, UserX,
  QrCode, SortAsc, SortDesc, RefreshCw, Camera, Hand,
} from 'lucide-react';

type SortKey = 'name' | 'institution' | 'checkinTime';
type SortDir = 'asc' | 'desc';

export default function AttendancePage() {
  const { guests, attendance } = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'hadir' | 'belum'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('checkinTime');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const rows = useMemo(() => {
    return guests
      .map((guest) => {
        const record = attendance.find((a) => a.guestId === guest.id && a.status === 'hadir');
        return { guest, record, isPresent: !!record };
      })
      .filter(({ guest, isPresent }) => {
        const matchSearch = search === '' ||
          [guest.name, guest.institution, guest.invitationId].some((v) =>
            v.toLowerCase().includes(search.toLowerCase()));
        const matchFilter = filterStatus === 'all' ||
          (filterStatus === 'hadir' && isPresent) ||
          (filterStatus === 'belum' && !isPresent);
        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        const valA = sortKey === 'checkinTime' ? (a.record?.checkinTime ?? '') :
                     sortKey === 'name' ? a.guest.name : a.guest.institution;
        const valB = sortKey === 'checkinTime' ? (b.record?.checkinTime ?? '') :
                     sortKey === 'name' ? b.guest.name : b.guest.institution;
        const cmp = valA.localeCompare(valB);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [guests, attendance, search, filterStatus, sortKey, sortDir]);

  const presentCount = attendance.filter((a) => a.status === 'hadir').length;
  const qrCount     = attendance.filter((a) => a.method === 'qr').length;
  const manualCount = attendance.filter((a) => a.method === 'manual').length;

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? sortDir === 'asc' ? <SortAsc size={12} className="inline ml-1" /> : <SortDesc size={12} className="inline ml-1" />
      : <SortAsc size={12} className="inline ml-1 opacity-30" />;

  const summaryStats = [
    { label: 'Total',   value: guests.length,  icon: ClipboardList, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    { label: 'Hadir',   value: presentCount,   icon: UserCheck,     color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
    { label: 'Belum',   value: guests.length - presentCount, icon: UserX, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
    { label: 'QR / Manual', value: `${qrCount}/${manualCount}`, icon: Camera, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryStats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="neo-card p-4 rounded-xl">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: bg }}>
              <Icon size={17} style={{ color }} />
            </div>
            <p className="text-2xl font-extrabold" style={{ color: '#064e3b', letterSpacing: '-0.02em' }}>{value}</p>
            <p className="text-xs font-bold mt-0.5 uppercase tracking-wide" style={{ color: 'rgba(5,150,105,0.6)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="neo-card p-4 flex flex-col sm:flex-row gap-3 rounded-xl">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(5,150,105,0.5)' }} />
          <input id="att-search" type="search" className="neo-input pl-9"
            placeholder="Cari nama, instansi, atau ID..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['all', 'hadir', 'belum'] as const).map((f) => (
            <button key={f} id={`att-filter-${f}`} onClick={() => setFilterStatus(f)}
              className={`neo-btn px-3 py-2 text-sm rounded-lg ${filterStatus === f ? 'neo-btn-primary' : 'neo-btn-outline'}`}>
              {f === 'all' ? 'Semua' : f === 'hadir' ? '✓ Hadir' : '✗ Belum'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="neo-card overflow-hidden rounded-xl" style={{ padding: 0 }}>
        <div className="px-4 py-3 text-xs font-semibold"
          style={{ background: 'rgba(5,150,105,0.04)', borderBottom: '1px solid rgba(5,150,105,0.08)', color: 'rgba(5,150,105,0.7)' }}>
          Menampilkan {rows.length} dari {guests.length} tamu
        </div>
        <div className="overflow-x-auto">
          <table className="neo-table">
            <thead>
              <tr>
                <th className="w-10 text-center">No</th>
                <th><button onClick={() => toggleSort('name')} className="font-bold hover:text-emerald-300 transition-colors">
                  Nama <SortIcon col="name" /></button></th>
                <th><button onClick={() => toggleSort('institution')} className="font-bold hover:text-emerald-300 transition-colors">
                  Instansi <SortIcon col="institution" /></button></th>
                <th>Jabatan</th>
                <th>Status</th>
                <th><button onClick={() => toggleSort('checkinTime')} className="font-bold hover:text-emerald-300 transition-colors">
                  Tgl Hadir <SortIcon col="checkinTime" /></button></th>
                <th>Jam Hadir</th>
                <th>Metode</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12" style={{ color: 'rgba(5,150,105,0.4)' }}>
                  <RefreshCw size={26} className="mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-sm">Tidak ada data</p>
                </td></tr>
              ) : rows.map(({ guest, record, isPresent }, idx) => (
                <tr key={guest.id} className="animate-fade-in">
                  <td className="font-bold text-center text-sm" style={{ color: 'rgba(5,150,105,0.5)' }}>{idx + 1}</td>
                  <td className="font-semibold text-sm" style={{ color: '#064e3b' }}>{guest.name}</td>
                  <td className="text-sm font-medium" style={{ color: '#065f46' }}>{guest.institution}</td>
                  <td className="text-sm" style={{ color: '#065f46' }}>{guest.position}</td>
                  <td>{isPresent
                    ? <span className="neo-badge neo-badge-green"><UserCheck size={11} /> HADIR</span>
                    : <span className="neo-badge neo-badge-red"><UserX size={11} /> BELUM</span>}
                  </td>
                  <td className="text-sm" style={{ color: 'rgba(5,150,105,0.7)' }}>
                    {record ? formatDate(record.checkinTime).split(',')[0] : '-'}
                  </td>
                  <td className="font-mono text-sm font-bold" style={{ color: '#064e3b' }}>
                    {record ? formatTime(record.checkinTime) : '-'}
                  </td>
                  <td>{record
                    ? record.method === 'qr'
                      ? <span className="neo-badge neo-badge-gold"><QrCode size={11} /> QR</span>
                      : <span className="neo-badge neo-badge-gray"><Hand size={11} /> Manual</span>
                    : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
