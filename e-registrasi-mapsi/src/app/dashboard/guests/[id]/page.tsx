'use client';

import { use, useState, useEffect } from 'react';
import { useStore, type Guest } from '@/lib/store';
import { generateQRDataURL } from '@/lib/qr';
import { generateQRCardPDF } from '@/lib/pdf';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Download, Printer, Share2,
  UserCheck, UserX, QrCode, Building2, Briefcase, Hash, Calendar,
} from 'lucide-react';

export default function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getGuestById, getAttendanceByGuest, checkIn, eventSettings } = useStore();
  const storeGuest = getGuestById(id);
  const [guest, setGuest] = useState<Guest | null>(storeGuest || null);
  const attendance = guest ? getAttendanceByGuest(guest.id) : undefined;

  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [checkInMsg, setCheckInMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (storeGuest) {
      setGuest(storeGuest);
      return;
    }
    // Fallback fetch if not in local store
    import('@/lib/api').then(({ fetchGuestById }) => {
      fetchGuestById(id).then((g) => {
        if (g) setGuest(g as any);
      });
    });
  }, [id, storeGuest]);

  useEffect(() => {
    if (!guest) return;
    generateQRDataURL(guest.invitationId, guest.name).then((url) => {
      setQrUrl(url);
      setLoading(false);
    });
  }, [guest]);

  if (!guest) {
    return (
      <div className="neo-card p-10 text-center animate-bounce-in rounded-xl max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(5,150,105,0.08)' }}>
          <QrCode size={32} style={{ color: 'rgba(5,150,105,0.4)' }} />
        </div>
        <h2 className="text-lg font-extrabold" style={{ color: '#064e3b' }}>Tamu Tidak Ditemukan</h2>
        <Link href="/dashboard/guests" className="neo-btn neo-btn-primary px-4 py-2.5 mt-5 inline-flex text-sm rounded-lg">
          <ArrowLeft size={15} /> Kembali
        </Link>
      </div>
    );
  }

  const downloadQR = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR-${guest.invitationId}-${guest.name}.png`;
    a.click();
  };

  const printInvitation = async () => {
    const logoUrl = eventSettings?.logoUrl || '/icon-512x512.png';
    const title = eventSettings?.name
      ? `${eventSettings.name} · ${eventSettings.year || 2026}`
      : 'MAPSI XXVII · 2026';
    const location = eventSettings?.location || 'Kecamatan Kedungtuban';
    await generateQRCardPDF(
      guest,
      qrUrl,
      logoUrl,
      title,
      location,
      `Undangan-${guest.invitationId}.pdf`,
    );
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `*Undangan MAPSI XXVII Kedungtuban 2026*\n\nKepada Yth.\n*${guest.name}*\n${guest.position}\n${guest.institution}\n\nID Undangan: *${guest.invitationId}*\n\nHarap menunjukkan QR Code ini kepada panitia saat tiba.\n\n_Terima kasih._\n\n🕌 Panitia MAPSI XXVII Kecamatan Kedungtuban 2026`
    );
    window.open(`https://wa.me/${guest.phone ? guest.phone.replace(/\D/g, '') : ''}?text=${text}`, '_blank');
  };

  const handleManualCheckin = async () => {
    const result = await checkIn(guest.id, 'manual');
    setCheckInMsg({ ok: result.success, text: result.message });
    setTimeout(() => setCheckInMsg(null), 4000);
  };

  const infoRows = [
    { icon: Hash,      label: 'ID Undangan',  value: <code className="font-mono font-bold text-base" style={{ color: '#064e3b' }}>{guest.invitationId}</code> },
    { icon: Building2, label: 'Instansi',      value: guest.institution },
    { icon: Briefcase, label: 'Jabatan',       value: guest.position },
    ...(attendance ? [{ icon: Calendar, label: 'Waktu Check-in', value: formatDateTime(attendance.checkinTime) }] : []),
  ];

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl mx-auto">
      <Link href="/dashboard/guests" className="neo-btn neo-btn-outline px-3 py-2 text-sm inline-flex rounded-lg">
        <ArrowLeft size={15} /> Kembali
      </Link>

      {checkInMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-bounce-in font-medium text-sm ${
          checkInMsg.ok
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {checkInMsg.ok ? '✅' : '⚠️'} {checkInMsg.text}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Guest info */}
        <div className="neo-card p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-extrabold leading-tight" style={{ color: '#064e3b', letterSpacing: '-0.02em' }}>
              {guest.name}
            </h2>
            {attendance ? (
              <span className="neo-badge neo-badge-green flex-shrink-0"><UserCheck size={11} /> HADIR</span>
            ) : (
              <span className="neo-badge neo-badge-red flex-shrink-0"><UserX size={11} /> BELUM</span>
            )}
          </div>

          <div className="space-y-3">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(5,150,105,0.1)' }}>
                  <Icon size={14} style={{ color: '#059669' }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-0.5"
                    style={{ color: 'rgba(5,150,105,0.6)' }}>{label}</p>
                  <div className="font-semibold text-sm" style={{ color: '#064e3b' }}>
                    {typeof value === 'string' ? value : value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!attendance && (
            <button id="btn-manual-checkin" onClick={handleManualCheckin}
              className="neo-btn neo-btn-primary w-full py-2.5 text-sm rounded-lg">
              <UserCheck size={15} /> Check-in Manual
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2"
            style={{ borderTop: '1px solid rgba(5,150,105,0.1)' }}>
            <button id="btn-download-qr" onClick={downloadQR} disabled={loading}
              className="neo-btn neo-btn-gold py-2.5 text-sm rounded-lg">
              <Download size={14} /> Unduh QR
            </button>
            <button id="btn-print-invitation" onClick={printInvitation} disabled={loading}
              className="neo-btn neo-btn-outline py-2.5 text-sm rounded-lg">
              <Printer size={14} /> Cetak
            </button>
            {guest.phone && (
              <button id="btn-whatsapp-share" onClick={shareWhatsApp}
                className="neo-btn col-span-2 py-2.5 text-sm rounded-lg font-bold"
                style={{ background: '#25D366', border: '1.5px solid #1ea952', color: '#fff', boxShadow: '0 4px 12px rgba(37,211,102,0.35)' }}>
                <Share2 size={14} /> Kirim via WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* QR card */}
        <div className="neo-card p-6 flex flex-col items-center gap-4">
          <h3 className="font-bold text-sm" style={{ color: '#064e3b' }}>QR Code Undangan</h3>
          <div id="invitation-card" className="w-full max-w-xs bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(5,150,105,0.18)', border: '1px solid rgba(5,150,105,0.15)' }}>
            {/* Card header */}
            <div className="p-3 text-center"
              style={{ background: 'linear-gradient(135deg,#064e3b,#047857)' }}>
              <p className="font-extrabold text-white text-sm">MAPSI XXVII · 2026</p>
              <p className="text-xs font-medium" style={{ color: 'rgba(167,243,208,0.9)' }}>Kecamatan Kedungtuban</p>
            </div>

            {/* QR */}
            <div className="p-4 flex justify-center">
              {loading ? (
                <div className="w-52 h-52 flex items-center justify-center rounded-lg"
                  style={{ background: 'rgba(5,150,105,0.05)' }}>
                  <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: '#059669', borderTopColor: 'transparent' }} />
                </div>
              ) : (
                <Image src={qrUrl} alt={`QR ${guest.invitationId}`} width={220} height={220} className="rounded-lg" />
              )}
            </div>

            {/* Guest info */}
            <div className="px-4 pb-4 text-center">
              <div className="h-px mb-3" style={{ background: 'rgba(5,150,105,0.15)' }} />
              <p className="font-extrabold text-sm" style={{ color: '#064e3b' }}>{guest.name}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#059669' }}>{guest.position}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(5,150,105,0.6)' }}>{guest.institution}</p>
              <code className="text-xs font-mono mt-2 inline-block px-2 py-0.5 rounded"
                style={{ background: 'rgba(5,150,105,0.08)', color: '#065f46' }}>
                {guest.invitationId}
              </code>
            </div>

            {/* Card footer */}
            <div className="p-2.5 text-center"
              style={{ background: 'rgba(5,150,105,0.06)', borderTop: '1px solid rgba(5,150,105,0.1)' }}>
              <p className="text-xs font-bold" style={{ color: '#065f46' }}>Tunjukkan kepada panitia</p>
            </div>
          </div>
          <p className="text-xs text-center max-w-xs font-medium" style={{ color: 'rgba(5,150,105,0.6)' }}>
            QR Code ini berisi identitas unik tamu untuk absensi otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}
