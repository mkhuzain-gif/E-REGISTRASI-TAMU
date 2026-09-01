'use client';

import { useState, useCallback, useTransition, useRef } from 'react';
import { useStore, Guest } from '@/lib/store';
import { truncate, formatDateTime } from '@/lib/utils';
import { generateQRDataURL } from '@/lib/qr';
import { generateBulkQRCardsPDF } from '@/lib/pdf';
import Link from 'next/link';
import {
  Plus, Search, Edit2, Trash2, QrCode, Printer,
  UserCheck, UserX, X, Save, RefreshCw,
  FileSpreadsheet, Download, Upload, ClipboardCopy, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface GuestFormData {
  name: string; institution: string; position: string; phone: string; notes: string;
}
const emptyForm: GuestFormData = { name: '', institution: '', position: '', phone: '', notes: '' };

// ─── Modal Single Guest ────────────────────────────────────────────────────────
function GuestModal({ guest, onClose, onSave }: {
  guest?: Guest; onClose: () => void; onSave: (d: GuestFormData) => void;
}) {
  const [form, setForm] = useState<GuestFormData>(
    guest
      ? { name: guest.name, institution: guest.institution, position: guest.position, phone: guest.phone ?? '', notes: guest.notes ?? '' }
      : emptyForm
  );
  const [errors, setErrors] = useState<Partial<GuestFormData>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Partial<GuestFormData> = {};
    if (!form.name.trim()) e.name = 'Nama wajib diisi';
    if (!form.institution.trim()) e.institution = 'Instansi wajib diisi';
    if (!form.position.trim()) e.position = 'Jabatan wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg animate-bounce-in max-h-[90vh] overflow-y-auto scrollbar-thin rounded-xl bg-white"
        style={{
          border: '1px solid rgba(5,150,105,0.15)',
          boxShadow: '0 20px 60px rgba(5,150,105,0.2), 0 4px 20px rgba(5,150,105,0.1)',
        }}>
        {/* Modal header */}
        <div className="p-5 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg,#064e3b,#047857)',
            borderRadius: '12px 12px 0 0',
          }}>
          <h2 className="font-extrabold text-white text-base">
            {guest ? '✏️ Edit Data Tamu' : '➕ Tambah Tamu Baru'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors rounded-lg p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {[
            { id: 'input-name', label: 'Nama Lengkap', key: 'name', placeholder: 'Contoh: H. Ahmad Fauzi, S.Pd', required: true },
            { id: 'input-institution', label: 'Instansi / Sekolah', key: 'institution', placeholder: 'Contoh: SDN Kedungtuban 01', required: true },
            { id: 'input-position', label: 'Jabatan', key: 'position', placeholder: 'Contoh: Kepala Sekolah', required: true },
            { id: 'input-phone', label: 'Nomor WhatsApp', key: 'phone', placeholder: '0812xxxxxxxx', required: false },
          ].map(({ id, label, key, placeholder, required }) => (
            <div key={key}>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                style={{ color: '#065f46' }}>
                {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <input id={id} className="neo-input"
                value={form[key as keyof GuestFormData]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder} />
              {errors[key as keyof GuestFormData] && (
                <p className="text-xs mt-1 font-bold" style={{ color: '#dc2626' }}>
                  {errors[key as keyof GuestFormData]}
                </p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: '#065f46' }}>
              Catatan <span className="font-normal lowercase" style={{ color: '#6b7280' }}>(opsional)</span>
            </label>
            <textarea id="input-notes" className="neo-input resize-none" rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Catatan tambahan..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="neo-btn neo-btn-outline flex-1 py-2.5 text-sm rounded-lg">
              <X size={15} /> Batal
            </button>
            <button type="submit" id="btn-save-guest" disabled={saving}
              className="neo-btn neo-btn-primary flex-1 py-2.5 text-sm rounded-lg">
              <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Import Excel & Bulk Paste ───────────────────────────────────────────
function BulkImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (items: GuestFormData[]) => Promise<void>;
}) {
  const [tab, setTab] = useState<'excel' | 'paste'>('excel');
  const [parsedRows, setParsedRows] = useState<GuestFormData[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download template Excel
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Nama Lengkap': 'H. Ahmad Fauzi, S.Pd',
        'Instansi / Sekolah': 'SDN Kedungtuban 01',
        'Jabatan': 'Kepala Sekolah',
        'Nomor WA': '081234567890',
        'Catatan': 'Tamu VIP',
      },
      {
        'Nama Lengkap': 'Dra. Siti Aminah',
        'Instansi / Sekolah': 'SDN Kedungtuban 02',
        'Jabatan': 'Kepala Sekolah',
        'Nomor WA': '081234567891',
        'Catatan': '',
      },
      {
        'Nama Lengkap': 'Budi Santoso, S.Pd.I',
        'Instansi / Sekolah': 'MI Miftahul Huda',
        'Jabatan': 'Kepala Madrasah',
        'Nomor WA': '081234567892',
        'Catatan': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Tamu');

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 26 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
    ];

    XLSX.writeFile(workbook, 'Template_Daftar_Tamu_MAPSI_2026.xlsx');
  };

  // Parse Excel file (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson.length) {
          setErrorMessage('File Excel kosong atau tidak memiliki data.');
          setParsedRows([]);
          return;
        }

        // Map column headers flexibly
        const rows: GuestFormData[] = rawJson
          .map((row) => {
            const name = row['Nama Lengkap'] || row['Nama'] || row['nama'] || row['NAMA'] || '';
            const institution = row['Instansi / Sekolah'] || row['Instansi'] || row['Sekolah'] || row['instansi'] || row['sekolah'] || '';
            const position = row['Jabatan'] || row['jabatan'] || row['JABATAN'] || row['Posisi'] || '-';
            const phone = String(row['Nomor WA'] || row['No WA'] || row['Telepon'] || row['HP'] || row['wa'] || row['phone'] || '').trim();
            const notes = row['Catatan'] || row['catatan'] || row['Keterangan'] || '';

            return {
              name: String(name).trim(),
              institution: String(institution).trim(),
              position: String(position).trim(),
              phone: phone === 'undefined' ? '' : phone,
              notes: String(notes).trim(),
            };
          })
          .filter((r) => r.name.length > 0 && r.institution.length > 0);

        if (rows.length === 0) {
          setErrorMessage('Tidak ada baris yang valid. Pastikan kolom "Nama" dan "Instansi" terisi.');
        }
        setParsedRows(rows);
      } catch (err: any) {
        setErrorMessage('Gagal membaca file Excel. Pastikan format file .xlsx atau .csv');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Parse Text Paste (Baris demi baris)
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    setErrorMessage('');

    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const rows: GuestFormData[] = [];

    for (const line of lines) {
      // Split by tab, comma, or semicolon
      let parts = line.split('\t');
      if (parts.length === 1) parts = line.split(',');
      if (parts.length === 1) parts = line.split(';');

      const name = parts[0]?.trim() || '';
      const institution = parts[1]?.trim() || '';
      const position = parts[2]?.trim() || 'Tamu Undangan';
      const phone = parts[3]?.trim() || '';
      const notes = parts[4]?.trim() || '';

      if (name) {
        rows.push({
          name,
          institution: institution || 'Umum',
          position,
          phone,
          notes,
        });
      }
    }

    setParsedRows(rows);
  };

  const handleExecuteImport = async () => {
    if (!parsedRows.length) return;
    setIsImporting(true);
    setErrorMessage('');
    try {
      await onImport(parsedRows);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message?.includes('violates row-level security') || err?.message?.includes('401')
          ? 'Izin database (RLS) di Supabase belum diperbarui. Jalankan query fix RLS di Supabase SQL Editor.'
          : `Gagal mengimpor tamu: ${err?.message || err}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl animate-bounce-in max-h-[90vh] overflow-y-auto scrollbar-thin rounded-xl bg-white flex flex-col"
        style={{
          border: '1px solid rgba(5,150,105,0.15)',
          boxShadow: '0 20px 60px rgba(5,150,105,0.2), 0 4px 20px rgba(5,150,105,0.1)',
        }}>
        {/* Header */}
        <div className="p-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#064e3b,#047857)', borderRadius: '12px 12px 0 0' }}>
          <div>
            <h2 className="font-extrabold text-white text-base flex items-center gap-2">
              <FileSpreadsheet size={20} /> Impor Data Tamu Cepat
            </h2>
            <p className="text-xs text-emerald-200 mt-0.5">Input ratusan tamu sekaligus via Excel atau Paste</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors rounded-lg p-1">
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-4 border-b flex gap-2 bg-emerald-50/50">
          <button
            onClick={() => { setTab('excel'); setParsedRows([]); setErrorMessage(''); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'excel' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-emerald-800 border'
            }`}
          >
            📊 Upload File Excel / CSV
          </button>
          <button
            onClick={() => { setTab('paste'); setParsedRows([]); setErrorMessage(''); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'paste' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-emerald-800 border'
            }`}
          >
            📋 Quick Paste Text
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="ml-auto neo-btn neo-btn-outline px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
            title="Download template file Excel"
          >
            <Download size={13} /> Download Template Excel
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">
          {/* Tab 1: Excel */}
          {tab === 'excel' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 rounded-xl p-6 text-center hover:bg-emerald-50/60 cursor-pointer transition-colors"
              >
                <FileSpreadsheet size={36} className="mx-auto text-emerald-600 mb-2" />
                <p className="font-bold text-sm text-emerald-900">
                  {fileName ? `File: ${fileName}` : 'Klik untuk Pilih File Excel (.xlsx / .xls / .csv)'}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Format kolom: Nama Lengkap, Instansi / Sekolah, Jabatan, Nomor WA, Catatan
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Paste */}
          {tab === 'paste' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-emerald-900 uppercase">
                Paste baris data tamu (Format: Nama, Instansi, Jabatan, Nomor WA)
              </label>
              <textarea
                rows={5}
                className="neo-input text-xs font-mono"
                placeholder={`Contoh (1 baris 1 tamu):\nH. Ahmad Fauzi, SDN 01 Kedungtuban, Kepala Sekolah, 08123456789\nDra. Siti Aminah, SDN 02 Kedungtuban, Kepala Sekolah\nBudi Santoso, MI Miftahul Huda, Kepala Madrasah`}
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
              />
              <p className="text-[11px] text-gray-500">
                Pemisah kolom bisa menggunakan tanda koma (<code>,</code>), titik koma (<code>;</code>), atau tab Excel.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-600" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Preview Parsed Rows */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>Preview Data Siap Diimpor ({parsedRows.length} Tamu)</span>
                <span className="text-emerald-600">ID & QR Code akan otomatis digenerate</span>
              </div>
              <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-emerald-100 text-emerald-900 sticky top-0 font-bold">
                    <tr>
                      <th className="p-2 text-left">No</th>
                      <th className="p-2 text-left">Nama</th>
                      <th className="p-2 text-left">Instansi</th>
                      <th className="p-2 text-left">Jabatan</th>
                      <th className="p-2 text-left">WA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-emerald-50/40">
                        <td className="p-2 text-gray-500">{i + 1}</td>
                        <td className="p-2 font-semibold text-gray-900">{r.name}</td>
                        <td className="p-2 text-gray-700">{r.institution}</td>
                        <td className="p-2 text-gray-600">{r.position}</td>
                        <td className="p-2 text-gray-500">{r.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[11px] text-gray-500 text-right">
                  Menampilkan 50 dari {parsedRows.length} baris...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="neo-btn neo-btn-outline flex-1 py-2.5 text-sm rounded-lg"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || isImporting}
            onClick={handleExecuteImport}
            className="neo-btn neo-btn-primary flex-1 py-2.5 text-sm rounded-lg disabled:opacity-50"
          >
            {isImporting ? 'Mengimpor Data...' : `🚀 Impor ${parsedRows.length} Tamu Sekarang`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Guests Page ──────────────────────────────────────────────────────────
export default function GuestsPage() {
  const { guests, attendance, addGuest, addBulkGuests, updateGuest, deleteGuest, deleteBulkGuests, isLoading, eventSettings } = useStore();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'hadir' | 'belum'>('all');
  const [modal, setModal] = useState<null | 'add' | Guest>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);

  const showToast = (ok: boolean, text: string) => {
    setToastMessage({ ok, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getStatus = useCallback(
    (guestId: string) => attendance.some((a) => a.guestId === guestId && a.status === 'hadir'),
    [attendance]
  );

  const filtered = guests.filter((g) => {
    const matchSearch = search === '' ||
      [g.name, g.institution, g.position, g.invitationId].some((v) =>
        v.toLowerCase().includes(search.toLowerCase()));
    const isPresent = getStatus(g.id);
    const matchFilter = filterStatus === 'all' ||
      (filterStatus === 'hadir' && isPresent) ||
      (filterStatus === 'belum' && !isPresent);
    return matchSearch && matchFilter;
  });

  const isAllSelected = filtered.length > 0 && filtered.every((g) => selectedIds.includes(g.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIdSet = new Set(filtered.map((g) => g.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const filteredIds = filtered.map((g) => g.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkDelete = () => {
    if (!selectedIds.length) return;
    startTransition(async () => {
      try {
        const count = selectedIds.length;
        await deleteBulkGuests(selectedIds);
        showToast(true, `Berhasil menghapus ${count} data tamu terpilih.`);
        setSelectedIds([]);
        setConfirmBulkDelete(false);
      } catch (err: any) {
        showToast(false, `Gagal menghapus tamu: ${err?.message || err}`);
      }
    });
  };

  const handleSave = (data: GuestFormData) => {
    startTransition(async () => {
      try {
        if (modal === 'add') {
          await addGuest(data);
          showToast(true, `Tamu "${data.name}" berhasil ditambahkan!`);
        } else if (modal && typeof modal === 'object') {
          await updateGuest(modal.id, data);
          showToast(true, 'Data tamu berhasil diperbarui!');
        }
        setModal(null);
      } catch (err: any) {
        showToast(false, `Gagal menyimpan tamu: ${err?.message || err}`);
      }
    });
  };

  const handleBulkImport = async (items: GuestFormData[]) => {
    try {
      const inserted = await addBulkGuests(items);
      showToast(true, `Berhasil mengimpor ${inserted.length} tamu undangan!`);
    } catch (err: any) {
      throw err;
    }
  };

  const presentCount = guests.filter((g) => getStatus(g.id)).length;

  const handleBulkPrintQR = async () => {
    const targetGuests = selectedIds.length > 0
      ? guests.filter((g) => selectedIds.includes(g.id))
      : filtered;

    if (!targetGuests.length) return;
    setIsBulkPrinting(true);
    try {
      const logoUrl = eventSettings?.logoUrl || '/icon-512x512.png';
      const title = eventSettings?.name
        ? `${eventSettings.name} · ${eventSettings.year || 2026}`
        : 'MAPSI XXVII · 2026';
      const location = eventSettings?.location || 'Kecamatan Kedungtuban';
      await generateBulkQRCardsPDF(
        targetGuests,
        generateQRDataURL,
        logoUrl,
        title,
        location,
      );
      showToast(true, `PDF berhasil dibuat untuk ${targetGuests.length} QR Code tamu!`);
    } catch (err: any) {
      showToast(false, `Gagal mencetak QR massal: ${err?.message || err}`);
    } finally {
      setIsBulkPrinting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-bounce-in shadow-md text-sm font-medium ${
          toastMessage.ok
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toastMessage.ok ? <CheckCircle2 size={18} className="text-green-600" /> : <AlertTriangle size={18} className="text-red-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: '#064e3b', letterSpacing: '-0.02em' }}>
            Data Tamu Undangan
          </h2>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(5,150,105,0.7)' }}>
            {guests.length} terdaftar · {presentCount} hadir · {guests.length - presentCount} belum
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
          <button
            id="btn-bulk-print-qr"
            onClick={handleBulkPrintQR}
            disabled={isBulkPrinting || (selectedIds.length === 0 && filtered.length === 0)}
            className="neo-btn neo-btn-outline px-3.5 py-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            title={selectedIds.length > 0 ? `Cetak QR ${selectedIds.length} tamu terpilih` : `Cetak semua QR (${filtered.length} tamu)`}
          >
            <Printer size={15} /> {isBulkPrinting ? 'Memproses...' : selectedIds.length > 0 ? `Cetak QR (${selectedIds.length} Terpilih)` : `Cetak Semua QR (${filtered.length})`}
          </button>

          <button
            id="btn-import-excel"
            onClick={() => setShowBulkModal(true)}
            className="neo-btn neo-btn-gold px-3.5 py-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5"
            title="Import daftar tamu dari Excel atau Paste Cepat"
          >
            <FileSpreadsheet size={15} /> Impor Excel / Cepat
          </button>

          <button
            id="btn-add-guest"
            onClick={() => setModal('add')}
            className="neo-btn neo-btn-primary px-3.5 py-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5"
          >
            <Plus size={15} /> Tambah Tamu
          </button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="neo-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(5,150,105,0.5)' }} />
          <input id="input-search" type="search" className="neo-input pl-9"
            placeholder="Cari nama, instansi, jabatan, atau ID..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['all', 'hadir', 'belum'] as const).map((f) => (
            <button key={f} id={`filter-${f}`} onClick={() => setFilterStatus(f)}
              className={`neo-btn px-3 py-2 text-sm rounded-lg ${filterStatus === f ? 'neo-btn-primary' : 'neo-btn-outline'}`}>
              {f === 'all' ? 'Semua' : f === 'hadir' ? '✓ Hadir' : '✗ Belum'}
            </button>
          ))}
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950 to-emerald-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg border border-emerald-700/60 animate-slide-in">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center font-extrabold text-sm border border-emerald-600">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">
                {selectedIds.length} tamu telah ditandai
              </p>
              <p className="text-xs text-emerald-300">
                Pilih aksi massal untuk tamu yang ditandai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-emerald-100 transition-colors border border-white/15"
            >
              Batal Tandai
            </button>

            <button
              id="btn-bulk-delete"
              onClick={() => setConfirmBulkDelete(true)}
              className="neo-btn neo-btn-danger px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
            >
              <Trash2 size={14} /> Hapus ({selectedIds.length}) Tamu Sekaligus
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="neo-card overflow-x-auto" style={{ padding: 0 }}>
        <table className="neo-table">
          <thead>
            <tr>
              <th className="w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  title={isAllSelected ? 'Batalkan tanda semua' : 'Tandai semua yang ditampilkan'}
                />
              </th>
              <th className="w-10 text-center">No</th>
              <th>ID Undangan</th>
              <th>Nama</th>
              <th>Instansi</th>
              <th>Jabatan</th>
              <th>Status</th>
              <th>Waktu Hadir</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12" style={{ color: 'rgba(5,150,105,0.5)' }}>
                  <RefreshCw size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-sm">Tidak ada data ditemukan</p>
                </td>
              </tr>
            ) : (
              filtered.map((guest, idx) => {
                const present = getStatus(guest.id);
                const record = attendance.find((a) => a.guestId === guest.id && a.status === 'hadir');
                const isSelected = selectedIds.includes(guest.id);
                return (
                  <tr key={guest.id} className={`animate-fade-in transition-colors ${isSelected ? 'bg-emerald-50/90' : ''}`}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(guest.id)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        title={`Tandai ${guest.name}`}
                      />
                    </td>
                    <td className="font-bold text-center text-sm" style={{ color: 'rgba(5,150,105,0.6)' }}>{idx + 1}</td>
                    <td>
                      <code className="text-xs px-2 py-0.5 rounded font-mono font-semibold"
                        style={{ background: 'rgba(5,150,105,0.08)', color: '#064e3b' }}>
                        {guest.invitationId}
                      </code>
                    </td>
                    <td className="font-semibold text-sm leading-snug" style={{ color: '#064e3b' }}>{guest.name}</td>
                    <td className="text-sm leading-snug" style={{ color: '#065f46' }}>{guest.institution}</td>
                    <td className="text-sm leading-snug" style={{ color: '#065f46' }}>{guest.position}</td>
                    <td>
                      {present ? (
                        <span className="neo-badge neo-badge-green"><UserCheck size={11} /> HADIR</span>
                      ) : (
                        <span className="neo-badge neo-badge-red"><UserX size={11} /> BELUM</span>
                      )}
                    </td>
                    <td className="text-xs" style={{ color: 'rgba(5,150,105,0.7)' }}>
                      {record ? formatDateTime(record.checkinTime) : '-'}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link href={`/dashboard/guests/${guest.id}`} id={`btn-qr-${guest.id}`}
                          className="neo-btn neo-btn-gold p-2 rounded-lg" title="Lihat QR">
                          <QrCode size={13} />
                        </Link>
                        <button id={`btn-edit-${guest.id}`} onClick={() => setModal(guest)}
                          className="neo-btn neo-btn-outline p-2 rounded-lg" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button id={`btn-delete-${guest.id}`} onClick={() => setConfirmDelete(guest.id)}
                          className="neo-btn neo-btn-danger p-2 rounded-lg" title="Hapus">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Single Guest */}
      {modal !== null && (
        <GuestModal
          guest={typeof modal === 'object' ? modal : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Modal Bulk Import Excel / Paste */}
      {showBulkModal && (
        <BulkImportModal
          onClose={() => setShowBulkModal(false)}
          onImport={handleBulkImport}
        />
      )}

      {/* Confirm Delete Single Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm p-6 animate-bounce-in rounded-xl bg-white"
            style={{ boxShadow: '0 20px 60px rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <h3 className="font-extrabold text-lg mb-2" style={{ color: '#064e3b' }}>🗑️ Hapus Tamu?</h3>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>
              Data tamu dan catatan absensinya akan dihapus permanen.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="neo-btn neo-btn-outline flex-1 py-2.5 rounded-lg text-sm">Batal</button>
              <button id="btn-confirm-delete" onClick={() => {
                startTransition(async () => {
                  try {
                    await deleteGuest(confirmDelete);
                    showToast(true, 'Data tamu berhasil dihapus.');
                  } catch (err: any) {
                    showToast(false, `Gagal menghapus: ${err?.message || err}`);
                  }
                  setConfirmDelete(null);
                });
              }}
                className="neo-btn neo-btn-danger flex-1 py-2.5 rounded-lg text-sm">
                <Trash2 size={14} /> {isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Bulk Delete Dialog */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm p-6 animate-bounce-in rounded-xl bg-white"
            style={{ boxShadow: '0 20px 60px rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.25)' }}>
            <h3 className="font-extrabold text-lg mb-2" style={{ color: '#991b1b' }}>
              🗑️ Hapus {selectedIds.length} Tamu Terpilih?
            </h3>
            <p className="text-sm mb-5 text-gray-600">
              Semua <strong className="text-gray-900">{selectedIds.length} tamu yang Anda tandai</strong> beserta seluruh catatan absensinya akan dihapus permanen sekaligus dari sistem.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                className="neo-btn neo-btn-outline flex-1 py-2.5 rounded-lg text-sm"
              >
                Batal
              </button>
              <button
                id="btn-confirm-bulk-delete"
                disabled={isPending}
                onClick={handleExecuteBulkDelete}
                className="neo-btn neo-btn-danger flex-1 py-2.5 rounded-lg text-sm font-bold"
              >
                <Trash2 size={14} /> {isPending ? 'Menghapus...' : `Ya, Hapus (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
