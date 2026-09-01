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
