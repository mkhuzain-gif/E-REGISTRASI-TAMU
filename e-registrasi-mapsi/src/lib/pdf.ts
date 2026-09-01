/**
 * PDF export utilities using jsPDF + html2canvas
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Guest, AttendanceRecord } from '@/lib/store';
import { formatDate, formatTime, formatDateTime } from '@/lib/utils';

const EVENT_NAME = 'MAPSI Tingkat Kecamatan Kedungtuban XXVII Tahun 2026';
const EVENT_DATE = 'Kedungtuban, 2026';

/**
 * Export full attendance list as PDF
 */
export async function exportAttendancePDF(
  guests: Guest[],
  records: AttendanceRecord[]
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DAFTAR HADIR TAMU UNDANGAN', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(11);
  doc.text(EVENT_NAME, pageWidth / 2, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(EVENT_DATE, pageWidth / 2, 31, { align: 'center' });

  // Divider
  doc.setLineWidth(0.5);
  doc.line(10, 34, pageWidth - 10, 34);

  // Stats
  const present = records.filter((r) => r.status === 'hadir').length;
  const absent = guests.length - present;
  doc.setFontSize(9);
  doc.text(`Total Undangan: ${guests.length}`, 10, 40);
  doc.text(`Hadir: ${present}`, 70, 40);
  doc.text(`Tidak Hadir: ${absent}`, 110, 40);
  doc.text(`Dicetak: ${formatDateTime(new Date().toISOString())}`, pageWidth - 10, 40, { align: 'right' });

  // Table headers
  const startY = 47;
  const colWidths = [10, 45, 55, 35, 30, 35, 20];
  const headers = ['No', 'Nama Tamu', 'Instansi / Sekolah', 'Jabatan', 'Tgl Hadir', 'Jam Hadir', 'Status'];
  const cols = [10, 20, 65, 120, 155, 185, 220];

  doc.setFillColor(20, 83, 45);
  doc.rect(10, startY - 5, pageWidth - 20, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  headers.forEach((h, i) => {
    doc.text(h, cols[i] + colWidths[i] / 2, startY, { align: 'center' });
  });

  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  let y = startY + 6;

  guests.forEach((guest, idx) => {
    const record = records.find((r) => r.guestId === guest.id && r.status === 'hadir');
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(240, 253, 244);
      doc.rect(10, y - 4, pageWidth - 20, 7, 'F');
    }
    doc.text(String(idx + 1), cols[0] + colWidths[0] / 2, y, { align: 'center' });
    doc.text(guest.name.substring(0, 28), cols[1], y);
    doc.text(guest.institution.substring(0, 32), cols[2], y);
    doc.text(guest.position.substring(0, 20), cols[3], y);
    doc.text(record ? formatDate(record.checkinTime).split(',')[0] : '-', cols[4], y);
    doc.text(record ? formatTime(record.checkinTime) : '-', cols[5], y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(record ? 22 : 185, record ? 163 : 28, record ? 74 : 26);
    doc.text(record ? 'HADIR' : 'BELUM', cols[6], y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 7;
  });

  // Footer
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Halaman ${p} dari ${totalPages} — E-Registrasi MAPSI 2026`, pageWidth / 2, 205, { align: 'center' });
  }

  doc.save(`Daftar-Hadir-MAPSI-2026-${Date.now()}.pdf`);
}

/**
 * Print a DOM element as PDF (for invitation card)
 */
export async function printElementAsPDF(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);
}

/**
 * Export SPJ Recap PDF
 */
export async function exportSPJPDF(
  guests: Guest[],
  records: AttendanceRecord[]
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const present = records.filter((r) => r.status === 'hadir').length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('REKAPITULASI DAFTAR HADIR (SPJ)', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.text(EVENT_NAME, pageWidth / 2, 27, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(10, 31, pageWidth - 10, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  let y = 40;
  const rows = [
    ['Nama Kegiatan', EVENT_NAME],
    ['Tempat', 'Kecamatan Kedungtuban'],
    ['Tahun', '2026'],
    ['Total Undangan', String(guests.length) + ' orang'],
    ['Jumlah Hadir', String(present) + ' orang'],
    ['Jumlah Tidak Hadir', String(guests.length - present) + ' orang'],
    ['Persentase Kehadiran', `${guests.length ? Math.round((present / guests.length) * 100) : 0}%`],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${value}`, 80, y);
    y += 10;
  });

  doc.setFontSize(10);
  y += 10;
  doc.text('Mengetahui,', 15, y);
  doc.text('Panitia Pelaksana,', pageWidth - 60, y);
  y += 30;
  doc.line(15, y, 65, y);
  doc.line(pageWidth - 65, y, pageWidth - 15, y);

  doc.save(`SPJ-MAPSI-2026-${Date.now()}.pdf`);
}

// ─── Helper: Load image as base64 for jsPDF ──────────────────────────────────

async function loadImageAsBase64(src: string): Promise<string | null> {
  try {
    // Already base64
    if (src.startsWith('data:')) return src;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  } catch {
    return null;
  }
}

// ─── Helper: Render a single QR card page on a jsPDF doc ─────────────────────

async function renderQRCardPage(
  doc: jsPDF,
  guest: { name: string; institution: string; position: string; invitationId: string },
  qrDataUrl: string,
  logoBase64: string | null,
  eventTitle: string,
  eventLocation: string,
) {
  const pw = doc.internal.pageSize.getWidth();   // ~148mm for A5
  const ph = doc.internal.pageSize.getHeight();  // ~210mm for A5
  const cx = pw / 2;
  const margin = 12;

  // ── Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, 'F');

  // ── Green header bar
  const headerH = 22;
  doc.setFillColor(6, 78, 59); // #064e3b
  doc.rect(0, 0, pw, headerH, 'F');

  // Logo in top-left of header
  if (logoBase64) {
    try {
      const logoSize = 14;
      const logoY = (headerH - logoSize) / 2;
      // White background behind logo
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin - 1, logoY - 1, logoSize + 2, logoSize + 2, 2, 2, 'F');
      doc.addImage(logoBase64, 'PNG', margin, logoY, logoSize, logoSize);
    } catch {
      // Ignore logo errors
    }
  }

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(eventTitle, cx, 9, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(eventLocation, cx, 16, { align: 'center' });

  // ── QR Code (large, centered)
  const qrSize = 72;
  const qrX = (pw - qrSize) / 2;
  const qrY = headerH + 12;

  // QR background with subtle border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3, 'FD');

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // ── Divider
  let y = qrY + qrSize + 14;
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.4);
  doc.line(margin + 15, y, pw - margin - 15, y);

  // ── Guest info
  y += 10;
  doc.setTextColor(6, 78, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(guest.name, cx, y, { align: 'center', maxWidth: pw - margin * 2 });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text(guest.position, cx, y, { align: 'center' });

  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(guest.institution, cx, y, { align: 'center', maxWidth: pw - margin * 2 });

  // ── Invitation ID badge
  y += 9;
  const badgeText = guest.invitationId;
  const badgeW = doc.getTextWidth(badgeText) + 10;
  doc.setFillColor(209, 250, 229); // #d1fae5
  doc.roundedRect(cx - badgeW / 2, y - 4, badgeW, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70);
  doc.text(badgeText, cx, y + 1, { align: 'center' });

  // ── Footer
  y += 14;
  doc.setFillColor(240, 253, 248); // very light green
  doc.rect(0, y - 2, pw, 14, 'F');
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.2);
  doc.line(0, y - 2, pw, y - 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('Tunjukkan kepada panitia', cx, y + 5, { align: 'center' });

  // ── Bottom credit
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text('E-Registrasi MAPSI · QR Code Undangan', cx, ph - 5, { align: 'center' });
}

/**
 * Generate a single QR card PDF for one guest (with logo from settings).
 * Replaces the old html2canvas-based approach to prevent content being cut off.
 */
export async function generateQRCardPDF(
  guest: { name: string; institution: string; position: string; invitationId: string },
  qrDataUrl: string,
  logoUrl: string,
  eventTitle: string,
  eventLocation: string,
  filename: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const logoBase64 = await loadImageAsBase64(logoUrl);

  await renderQRCardPage(doc, guest, qrDataUrl, logoBase64, eventTitle, eventLocation);

  doc.save(filename);
}

/**
 * Generate a multi-page PDF with QR cards for multiple guests (bulk print).
 * Each guest gets their own A5 page with logo, QR code, and info.
 */
export async function generateBulkQRCardsPDF(
  guests: Array<{ name: string; institution: string; position: string; invitationId: string }>,
  generateQR: (invitationId: string, name: string) => Promise<string>,
  logoUrl: string,
  eventTitle: string,
  eventLocation: string,
): Promise<void> {
  if (!guests.length) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const logoBase64 = await loadImageAsBase64(logoUrl);

  for (let i = 0; i < guests.length; i++) {
    if (i > 0) doc.addPage();

    const guest = guests[i];
    const qrDataUrl = await generateQR(guest.invitationId, guest.name);

    await renderQRCardPage(doc, guest, qrDataUrl, logoBase64, eventTitle, eventLocation);
  }

  doc.save(`QR-Undangan-Semua-Tamu-${Date.now()}.pdf`);
}
