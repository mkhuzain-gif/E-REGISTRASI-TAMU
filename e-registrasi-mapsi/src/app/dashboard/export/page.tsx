'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { exportAttendancePDF, exportSPJPDF } from '@/lib/pdf';
import {
  Download, FileText, Database, Upload, Printer,
  CheckCircle, AlertTriangle, ClipboardList, RefreshCw,
} from 'lucide-react';

export default function ExportPage() {
  const { guests, attendance, exportData, clearAttendance } = useStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 4000);
  };

  const present = attendance.filter((a) => a.status === 'hadir').length;
  const absent = guests.length - present;
  const pct = guests.length > 0 ? Math.round((present / guests.length) * 100) : 0;

  const handleExportPDF = async () => {
    if (!guests.length) { showToast(false, 'Belum ada data tamu.'); return; }
    setLoading('pdf');
    try { await exportAttendancePDF(guests, attendance); showToast(true, 'PDF berhasil diunduh.'); }
    catch { showToast(false, 'Gagal mengekspor PDF.'); }
    setLoading(null);
  };

  const handleExportSPJ = async () => {
    if (!guests.length) { showToast(false, 'Belum ada data tamu.'); return; }
    setLoading('spj');
    try { await exportSPJPDF(guests, attendance); showToast(true, 'Rekap SPJ berhasil diunduh.'); }
    catch { showToast(false, 'Gagal membuat rekap SPJ.'); }
    setLoading(null);
  };

  const handleExportJSON = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup-mapsi-2026-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast(true, 'Backup berhasil diunduh.');
  };

  // Import dari JSON tidak diperlukan lagi — data tersimpan di Supabase Cloud
  // Gunakan Dashboard Supabase untuk restore data jika diperlukan

  const exportCards = [
    {
      id: 'export-pdf', icon: FileText, title: 'Daftar Hadir (PDF)',
      desc: 'Ekspor daftar hadir lengkap dalam format PDF landscape A4 untuk dokumentasi dan arsip.',
      action: handleExportPDF, label: 'Unduh PDF', loadingKey: 'pdf',
      iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,0.1)',
    },
    {
      id: 'export-spj', icon: ClipboardList, title: 'Rekap SPJ',
      desc: 'Ekspor rekap kehadiran untuk Surat Pertanggungjawaban (SPJ) kegiatan MAPSI 2026.',
      action: handleExportSPJ, label: 'Unduh Rekap SPJ', loadingKey: 'spj',
      iconColor: '#059669', iconBg: 'rgba(5,150,105,0.1)',
    },
    {
      id: 'export-print', icon: Printer, title: 'Cetak Halaman',
      desc: 'Cetak tampilan absensi saat ini menggunakan printer. Pastikan filter sudah sesuai.',
      action: () => window.print(), label: 'Cetak Sekarang', loadingKey: null,
      iconColor: '#7c3aed', iconBg: 'rgba(124,58,237,0.1)',
    },
    {
      id: 'export-json', icon: Database, title: 'Backup Data (JSON)',
      desc: 'Unduh seluruh data tamu dan absensi sebagai file JSON untuk backup.',
      action: handleExportJSON, label: 'Unduh Backup', loadingKey: null,
      iconColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.1)',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-bounce-in font-medium text-sm ${
          toast.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.ok ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {toast.text}
        </div>
      )}

      {/* Summary banner */}
      <div className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg,#064e3b,#065f46,#047857)',
          boxShadow: '0 8px 32px rgba(5,150,105,0.2)',
        }}>
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(110,231,183,0.8)' }}>
            📊 Ringkasan Data
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { l: 'Total Undangan', v: guests.length },
              { l: 'Hadir',          v: present },
              { l: 'Belum Hadir',    v: absent  },
            ].map(({ l, v }) => (
              <div key={l} className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-2xl font-extrabold text-white">{v}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(167,243,208,0.85)' }}>{l}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5"
              style={{ color: 'rgba(167,243,208,0.8)' }}>
              <span>Tingkat Kehadiran</span>
              <span className="font-extrabold text-white">{pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#34d399,#6ee7b7)', boxShadow: '0 0 10px rgba(52,211,153,0.5)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {exportCards.map(({ id, icon: Icon, title, desc, action, label, loadingKey, iconColor, iconBg }) => (
          <div key={id} id={id} className="neo-card p-5 rounded-xl flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
              <Icon size={20} style={{ color: iconColor }} />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-sm" style={{ color: '#064e3b' }}>{title}</h3>
              <p className="text-xs font-medium mt-1 leading-relaxed" style={{ color: 'rgba(5,150,105,0.65)' }}>{desc}</p>
            </div>
            <button onClick={action} disabled={loading === loadingKey}
              className="neo-btn neo-btn-primary py-2.5 text-sm rounded-lg disabled:opacity-50">
              {loading === loadingKey
                ? <><RefreshCw size={13} className="animate-spin" /> Memproses...</>
                : <><Download size={13} /> {label}</>}
            </button>
          </div>
        ))}
      </div>

      {/* Import — tidak diperlukan karena data tersimpan di Supabase */}
      <div className="neo-card p-5 rounded-xl" style={{ opacity: 0.7 }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(107,114,128,0.1)' }}>
            <Database size={18} style={{ color: '#6b7280' }} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm" style={{ color: '#064e3b' }}>Backup Cloud (Supabase)</h3>
            <p className="text-xs font-medium" style={{ color: 'rgba(5,150,105,0.65)' }}>Data tersimpan otomatis di Supabase</p>
          </div>
        </div>
        <p className="text-xs font-medium px-1" style={{ color: '#6b7280' }}>
          ☁️ Data tamu dan absensi tersimpan permanen di Supabase Cloud. Tidak perlu import/export manual. Gunakan Dashboard Supabase untuk keperluan restore atau backup lanjutan.
        </p>
      </div>

      {/* Danger zone */}
      <div className="p-5 rounded-xl"
        style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)' }}>
        <h3 className="font-extrabold text-sm mb-1" style={{ color: '#b91c1c' }}>⚠️ Zona Berbahaya</h3>
        <p className="text-xs font-medium mb-4" style={{ color: '#dc2626' }}>
          Reset semua data absensi. Data tamu tidak terhapus. Tidak bisa dibatalkan.
        </p>
        <button id="btn-clear-attendance" onClick={() => setConfirmClear(true)}
          className="neo-btn neo-btn-danger py-2.5 text-sm rounded-lg">
          <RefreshCw size={14} /> Reset Absensi
        </button>
      </div>

      {/* Confirm reset */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-xl animate-bounce-in bg-white"
            style={{ boxShadow: '0 20px 60px rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.15)' }}>
            <h3 className="font-extrabold text-lg mb-2" style={{ color: '#064e3b' }}>Reset Data Absensi?</h3>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>
              Semua catatan kehadiran akan dihapus. Data tamu tidak terpengaruh.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(false)}
                className="neo-btn neo-btn-outline flex-1 py-2.5 rounded-lg text-sm">Batal</button>
              <button id="btn-confirm-clear"
                onClick={() => { clearAttendance(); setConfirmClear(false); showToast(true, 'Data absensi direset.'); }}
                className="neo-btn neo-btn-danger flex-1 py-2.5 rounded-lg text-sm">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
