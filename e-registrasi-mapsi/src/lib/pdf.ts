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

    // Dynamic sizing for name, institution, position so long text is never truncated
    const nameFontSize = guest.name.length > 38 ? 7 : guest.name.length > 28 ? 7.8 : 8.5;
    doc.setFontSize(nameFontSize);
    doc.text(guest.name, cols[1], y, { maxWidth: colWidths[1] - 1 });

    const instFontSize = guest.institution.length > 35 ? 7 : 8;
    doc.setFontSize(instFontSize);
    doc.text(guest.institution, cols[2], y, { maxWidth: colWidths[2] - 1 });

    const posFontSize = guest.position.length > 22 ? 7 : 8;
    doc.setFontSize(posFontSize);
    doc.text(guest.position, cols[3], y, { maxWidth: colWidths[3] - 1 });

    doc.setFontSize(8.5);
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
  const qrSize = 82;
  const qrX = (pw - qrSize) / 2;
  const qrY = headerH + 9;

  // QR background with subtle border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3, 'FD');

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // ── Divider
  let y = qrY + qrSize + 11;
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.4);
  doc.line(margin + 15, y, pw - margin - 15, y);

  // ── Guest info
  y += 8;
  doc.setTextColor(6, 78, 59);
  doc.setFont('helvetica', 'bold');
  const nameFontSize = guest.name.length > 40 ? 11 : guest.name.length > 28 ? 12.5 : 14;
  doc.setFontSize(nameFontSize);
  const nameLines = doc.splitTextToSize(guest.name, pw - margin * 2);
  doc.text(nameLines, cx, y, { align: 'center' });
  y += nameLines.length * (nameFontSize * 0.42) + 2;

  doc.setFont('helvetica', 'normal');
  const posFontSize = guest.position.length > 35 ? 8.5 : 10;
  doc.setFontSize(posFontSize);
  doc.setTextColor(5, 150, 105);
  const posLines = doc.splitTextToSize(guest.position, pw - margin * 2);
  doc.text(posLines, cx, y, { align: 'center' });
  y += posLines.length * (posFontSize * 0.4) + 1.5;

  const instFontSize = guest.institution.length > 40 ? 8 : 9;
  doc.setFontSize(instFontSize);
  doc.setTextColor(80, 80, 80);
  const instLines = doc.splitTextToSize(guest.institution, pw - margin * 2);
  doc.text(instLines, cx, y, { align: 'center' });
  y += instLines.length * (instFontSize * 0.4) + 2.5;

  // ── Invitation ID badge
  const badgeText = guest.invitationId;
  const badgeW = doc.getTextWidth(badgeText) + 10;
  doc.setFillColor(209, 250, 229); // #d1fae5
  doc.roundedRect(cx - badgeW / 2, y - 3.5, badgeW, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70);
  doc.text(badgeText, cx, y + 1.2, { align: 'center' });

  // ── Footer
  y += 13;
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
 * Uses F4 paper (215.9mm × 330mm) with 8 cards per page (2 cols × 4 rows).
 * Cards are separated by dotted cut-lines for easy cutting.
 */
export async function generateBulkQRCardsPDF(
  guests: Array<{ name: string; institution: string; position: string; invitationId: string }>,
  generateQR: (invitationId: string, name: string) => Promise<string>,
  logoUrl: string,
  eventTitle: string,
  eventLocation: string,
): Promise<void> {
  if (!guests.length) return;

  // F4 paper: 215.9mm × 330.2mm
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [215.9, 330.2] });
  const logoBase64 = await loadImageAsBase64(logoUrl);

  const pw = 215.9;
  const ph = 330.2;
  const cols = 2;
  const rows = 4;
  const cardsPerPage = cols * rows; // 8

  const marginX = 6;
  const marginY = 6;
  const cardW = (pw - marginX * 2) / cols;   // ~101.95mm
  const cardH = (ph - marginY * 2) / rows;   // ~79.55mm

  const totalPages = Math.ceil(guests.length / cardsPerPage);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // Draw dotted cut lines for this page
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([1.5, 1.5], 0);

    // Vertical center line
    const midX = marginX + cardW;
    doc.line(midX, marginY, midX, ph - marginY);

    // Horizontal lines between rows
    for (let r = 1; r < rows; r++) {
      const lineY = marginY + cardH * r;
      doc.line(marginX, lineY, pw - marginX, lineY);
    }

    // Outer border (optional, very light)
    doc.setDrawColor(220, 220, 220);
    doc.rect(marginX, marginY, pw - marginX * 2, ph - marginY * 2);

    // Reset dash pattern
    doc.setLineDashPattern([], 0);

    // Render each card on this page
    for (let slot = 0; slot < cardsPerPage; slot++) {
      const guestIdx = page * cardsPerPage + slot;
      if (guestIdx >= guests.length) break;

      const guest = guests[guestIdx];
      const col = slot % cols;
      const row = Math.floor(slot / cols);

      const x = marginX + col * cardW;
      const y = marginY + row * cardH;

      const qrDataUrl = await generateQR(guest.invitationId, guest.name);

      // Render mini card inside the bounding box (x, y, cardW, cardH)
      await renderMiniQRCard(doc, guest, qrDataUrl, logoBase64, eventTitle, eventLocation, x, y, cardW, cardH);
    }

    // Page number at very bottom
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(170, 170, 170);
    doc.text(`Hal. ${page + 1}/${totalPages} — E-Registrasi MAPSI`, pw / 2, ph - 1.5, { align: 'center' });
  }

  doc.save(`QR-Undangan-Semua-Tamu-${Date.now()}.pdf`);
}

// ─── Helper: Render a compact mini QR card in a given bounding box ───────────

async function renderMiniQRCard(
  doc: jsPDF,
  guest: { name: string; institution: string; position: string; invitationId: string },
  qrDataUrl: string,
  logoBase64: string | null,
  eventTitle: string,
  eventLocation: string,
  bx: number, by: number, bw: number, bh: number,
) {
  const cx = bx + bw / 2;
  const pad = 1.5;
  const innerX = bx + pad;
  const innerY = by + pad;
  const innerW = bw - pad * 2;
  const innerH = bh - pad * 2;

  // ── Card background with rounded corners and subtle shadow effect
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(innerX + 0.3, innerY + 0.3, innerW, innerH, 2.0, 2.0, 'F');

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.roundedRect(innerX, innerY, innerW, innerH, 2.0, 2.0, 'FD');

  // ── Compact header bar with logo and event info
  const headerH = 7.5;
  const headerX = innerX + 1;
  const headerY = innerY + 1;
  const headerW = innerW - 2;

  // Header background - dark emerald
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(headerX, headerY, headerW, headerH, 1.5, 1.5, 'F');

  // Logo in header (tiny)
  if (logoBase64) {
    try {
      const logoSize = 4.8;
      const logoY = headerY + (headerH - logoSize) / 2;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(headerX + 1.2, logoY - 0.2, logoSize + 0.4, logoSize + 0.4, 0.6, 0.6, 'F');
      doc.addImage(logoBase64, 'PNG', headerX + 1.4, logoY, logoSize, logoSize);
    } catch {
      // Ignore logo errors
    }
  }

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  doc.text(eventTitle, cx, headerY + 3.0, { align: 'center' });
  doc.setFontSize(3.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(187, 247, 208);
  doc.text(eventLocation, cx, headerY + 5.8, { align: 'center' });

  // ── QR Code - large and prominent (50mm for easy scanning & clean layout)
  const qrSize = 50;
  const qrX = cx - qrSize / 2;
  const qrY = headerY + headerH + 1.8;

  // Clean white QR zone with thin elegant emerald border
  const qrPad = 1.0;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 1.0, 1.0, 'FD');

  // Corner accents on QR frame for a modern & professional viewfinder look
  const cornerLen = 3.0;
  const cornerOff = 0.5;
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  // Top-left
  doc.line(qrX - qrPad - cornerOff, qrY - qrPad - cornerOff, qrX - qrPad - cornerOff + cornerLen, qrY - qrPad - cornerOff);
  doc.line(qrX - qrPad - cornerOff, qrY - qrPad - cornerOff, qrX - qrPad - cornerOff, qrY - qrPad - cornerOff + cornerLen);
  // Top-right
  doc.line(qrX + qrSize + qrPad + cornerOff, qrY - qrPad - cornerOff, qrX + qrSize + qrPad + cornerOff - cornerLen, qrY - qrPad - cornerOff);
  doc.line(qrX + qrSize + qrPad + cornerOff, qrY - qrPad - cornerOff, qrX + qrSize + qrPad + cornerOff, qrY - qrPad - cornerOff + cornerLen);
  // Bottom-left
  doc.line(qrX - qrPad - cornerOff, qrY + qrSize + qrPad + cornerOff, qrX - qrPad - cornerOff + cornerLen, qrY + qrSize + qrPad + cornerOff);
  doc.line(qrX - qrPad - cornerOff, qrY + qrSize + qrPad + cornerOff, qrX - qrPad - cornerOff, qrY + qrSize + qrPad + cornerOff - cornerLen);
  // Bottom-right
  doc.line(qrX + qrSize + qrPad + cornerOff, qrY + qrSize + qrPad + cornerOff, qrX + qrSize + qrPad + cornerOff - cornerLen, qrY + qrSize + qrPad + cornerOff);
  doc.line(qrX + qrSize + qrPad + cornerOff, qrY + qrSize + qrPad + cornerOff, qrX + qrSize + qrPad + cornerOff, qrY + qrSize + qrPad + cornerOff - cornerLen);

  // Render QR image
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // ── Simplified Guest Info below QR: Only Guest Name + School/Institution
  const maxContentWidth = innerW - 6;
  let ty = qrY + qrSize + qrPad + 3.6;

  // 1. Guest Name (Bold, Clear, Readable)
  doc.setFont('helvetica', 'bold');
  const nameFontSize = guest.name.length > 40 ? 6.2 : guest.name.length > 26 ? 6.8 : 7.4;
  doc.setFontSize(nameFontSize);
  doc.setTextColor(17, 24, 39); // deep dark text
  const nameLines = doc.splitTextToSize(guest.name, maxContentWidth);
  doc.text(nameLines, cx, ty, { align: 'center' });
  ty += nameLines.length * (nameFontSize * 0.38) + 1.2;

  // 2. School / Institution (Bold Emerald Green, Clean)
  doc.setFont('helvetica', 'bold');
  const instFontSize = guest.institution.length > 35 ? 4.8 : 5.4;
  doc.setFontSize(instFontSize);
  doc.setTextColor(5, 150, 105); // emerald green
  const instLines = doc.splitTextToSize(guest.institution, maxContentWidth);
  doc.text(instLines, cx, ty, { align: 'center' });
}

