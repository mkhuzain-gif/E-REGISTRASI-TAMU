'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { parseQRPayload } from '@/lib/qr';
import { fetchGuestByInvitationId, fetchGuestById, findGuestByQuery } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import {
  QrCode, Search, UserCheck, X, Camera,
  CheckCircle, AlertTriangle, Info, ScanLine, SwitchCamera,
  Upload, Sparkles,
} from 'lucide-react';

type ScanResult =
  | { type: 'success'; guestName: string; institution: string; time: string }
  | { type: 'duplicate'; guestName: string; prevTime: string }
  | { type: 'invalid'; raw: string }
  | null;

interface CameraDevice {
  id: string;
  label: string;
}

// Audio beep notification using Web Audio API
function playScanBeep(success: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // AudioContext blocked or unsupported
  }
}

export default function ScannerPage() {
  const { guests, checkIn, getGuestByInvitationId } = useStore();
  const [mode, setMode] = useState<'scanner' | 'manual'>('scanner');
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Camera selection states
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const html5QrCodeRef = useRef<any>(null);
  const isStartingRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const manualFiltered = manualSearch.length >= 2
    ? guests.filter((g) =>
        g.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
        g.institution.toLowerCase().includes(manualSearch.toLowerCase()) ||
        g.invitationId.toLowerCase().includes(manualSearch.toLowerCase()))
    : [];

  const handleQRDetected = useCallback(async (decodedText: string) => {
    // Prevent duplicate scan processing in quick succession (< 2 seconds)
    const now = Date.now();
    if (
      lastScannedCodeRef.current.code === decodedText &&
      now - lastScannedCodeRef.current.time < 2500
    ) {
      return;
    }
    lastScannedCodeRef.current = { code: decodedText, time: now };
    setIsProcessing(true);

    try {
      const payload = parseQRPayload(decodedText);
      const queryId = payload?.id || decodedText;
      const queryName = payload?.name || undefined;

      // 1. Search in local store by invitation_id or id
      let guest = queryId ? getGuestByInvitationId(queryId) : undefined;

      // 2. Search by name in local store
      if (!guest && queryName) {
        guest = guests.find((g) => g.name.toLowerCase().trim() === queryName.toLowerCase().trim());
      }

      // 3. Fallback search by raw string in local store
      if (!guest && decodedText) {
        const cleanDecoded = decodedText.toLowerCase().trim();
        guest = guests.find((g) =>
          g.invitationId.toLowerCase().trim() === cleanDecoded ||
          g.id.toLowerCase().trim() === cleanDecoded ||
          g.name.toLowerCase().trim() === cleanDecoded
        );
      }

      // 4. Query Supabase directly if not in local memory
      if (!guest) {
        guest = (await findGuestByQuery(queryId, queryName)) || undefined;
      }

      if (!guest) {
        playScanBeep(false);
        setScanResult({ type: 'invalid', raw: decodedText });
        setTimeout(() => setScanResult(null), 5000);
        return;
      }

      const result = await checkIn(guest.id, 'qr');
      if (result.success && result.record) {
        playScanBeep(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        setScanResult({
          type: 'success',
          guestName: guest.name,
          institution: guest.institution,
          time: formatDateTime(result.record.checkinTime),
        });
      } else {
        playScanBeep(false);
        const prev = useStore.getState().attendance.find((a) => a.guestId === guest.id && a.status === 'hadir');
        setScanResult({
          type: 'duplicate',
          guestName: guest.name,
          prevTime: prev ? formatDateTime(prev.checkinTime) : '-',
        });
      }
    } catch (e) {
      console.error('Scan handling error:', e);
      setScanResult({ type: 'invalid', raw: decodedText });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanResult(null), 5000);
    }
  }, [checkIn, getGuestByInvitationId, guests]);

  // Safely stop existing scanner instance
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        // Safe to ignore on unmount
      } finally {
        html5QrCodeRef.current = null;
        setIsScanning(false);
        setScannerReady(false);
      }
    }
  };

  // Start scanner with optimized hardware BarcodeDetector and fallback
  const startScanner = async (cameraIdToUse?: string) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setScannerError('');

    try {
      await stopScanner();

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // Clear DOM container
      const container = document.getElementById('qr-scanner-container');
      if (container) {
        container.innerHTML = '';
      }

      // Enumerate available cameras if list is empty
      let availableCameras = cameras;
      if (availableCameras.length === 0) {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          throw new Error('Tidak ada kamera yang ditemukan pada perangkat ini.');
        }
        availableCameras = devices.map((d, index) => ({
          id: d.id,
          label: d.label || `Kamera ${index + 1}`,
        }));
        setCameras(availableCameras);
      }

      // Pick preferred camera (rear camera first, otherwise selected/first)
      let activeCamId = cameraIdToUse;
      if (!activeCamId) {
        const rearCam = availableCameras.find((c) =>
          /back|rear|environment|belakang/i.test(c.label)
        );
        activeCamId = rearCam ? rearCam.id : availableCameras[0]?.id;
      }
      setSelectedCameraId(activeCamId);

      // Create instance with BarcodeDetector hardware acceleration enabled
      const scannerInstance = new Html5Qrcode('qr-scanner-container', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      html5QrCodeRef.current = scannerInstance;

      await scannerInstance.start(
        activeCamId,
        {
          fps: 20, // 20 FPS for instant frame recognition
          qrbox: (w: number, h: number) => {
            const minEdge = Math.min(w, h);
            const qrBoxSize = Math.max(Math.floor(minEdge * 0.8), 200);
            return { width: qrBoxSize, height: qrBoxSize };
          },
          videoConstraints: {
            deviceId: { exact: activeCamId },
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 },
          },
        },
        (decodedText: string) => handleQRDetected(decodedText),
        () => {} // frame drop silent
      );

      setScannerReady(true);
      setIsScanning(true);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setScannerError(
        msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')
          ? 'Izin kamera ditolak. Klik ikon 🔒 di address bar browser untuk mengizinkan kamera.'
          : msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('devicenotfound') || msg.toLowerCase().includes('tidak ada')
          ? 'Kamera tidak ditemukan. Pastikan kamera terpasang dan berfungsi.'
          : `Gagal memulai scanner: ${msg}`
      );
    } finally {
      isStartingRef.current = false;
    }
  };

  // Scan from uploaded file / image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const fileScanner = new Html5Qrcode('qr-file-scan-temp', {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      const decodedText = await fileScanner.scanFile(file, true);
      await handleQRDetected(decodedText);
      await fileScanner.clear();
    } catch (err) {
      setScanResult({ type: 'invalid', raw: 'Gambar tidak terbaca' });
      setTimeout(() => setScanResult(null), 5000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (mode === 'scanner') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [mode]);

  const handleCameraChange = (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    startScanner(newCameraId);
  };

  const handleManualCheckin = async (guestId: string) => {
    const result = await checkIn(guestId, 'manual');
    const guest = guests.find((g) => g.id === guestId)!;
    if (result.success && result.record) {
      playScanBeep(true);
      setScanResult({
        type: 'success',
        guestName: guest.name,
        institution: guest.institution,
        time: formatDateTime(result.record.checkinTime),
      });
    } else {
      playScanBeep(false);
      const prev = useStore.getState().attendance.find((a) => a.guestId === guestId && a.status === 'hadir');
      setScanResult({
        type: 'duplicate',
        guestName: guest.name,
        prevTime: prev ? formatDateTime(prev.checkinTime) : '-',
      });
    }
    setManualSearch('');
    setTimeout(() => setScanResult(null), 5000);
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      {/* Hidden container for file scan */}
      <div id="qr-file-scan-temp" style={{ display: 'none' }} />

      {/* Tab switcher */}
      <div className="neo-card overflow-hidden rounded-xl" style={{ padding: 0 }}>
        <div className="grid grid-cols-2">
          {(['scanner', 'manual'] as const).map((tab, i) => (
            <button
              key={tab}
              id={`tab-${tab}`}
              onClick={() => {
                setMode(tab);
                setScanResult(null);
              }}
              className={`py-3.5 font-bold flex items-center justify-center gap-2 text-sm transition-all ${
                mode === tab ? 'text-white' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
              style={{
                background: mode === tab ? 'linear-gradient(135deg,#059669,#047857)' : '',
                borderRight: i === 0 ? '1px solid rgba(5,150,105,0.12)' : '',
              }}
            >
              {tab === 'scanner' ? <><Camera size={16} /> Scan QR Code</> : <><Search size={16} /> Check-in Manual</>}
            </button>
          ))}
        </div>
      </div>

      {/* Scan result banner */}
      {scanResult && (
        <div className={`p-4 rounded-xl flex gap-3 items-start animate-bounce-in shadow-lg ${
          scanResult.type === 'success'   ? 'bg-green-50 border-2 border-green-500' :
          scanResult.type === 'duplicate' ? 'bg-amber-50 border-2 border-amber-500' :
                                            'bg-red-50 border-2 border-red-500'
        }`}>
          {scanResult.type === 'success'   && <CheckCircle   className="text-green-600 flex-shrink-0 mt-0.5" size={24} />}
          {scanResult.type === 'duplicate' && <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={24} />}
          {scanResult.type === 'invalid'   && <X             className="text-red-600 flex-shrink-0 mt-0.5"   size={24} />}
          <div className="flex-1">
            {scanResult.type === 'success' && (
              <>
                <p className="font-extrabold text-green-800 text-base">✅ Check-in Berhasil!</p>
                <p className="font-bold text-sm text-green-900 mt-0.5">{scanResult.guestName}</p>
                <p className="text-xs text-green-700 mt-0.5 font-medium">{scanResult.institution} · {scanResult.time}</p>
              </>
            )}
            {scanResult.type === 'duplicate' && (
              <>
                <p className="font-extrabold text-amber-800 text-base">⚠️ Tamu Sudah Check-in!</p>
                <p className="font-bold text-sm text-amber-900 mt-0.5">{scanResult.guestName}</p>
                <p className="text-xs text-amber-700 mt-0.5 font-medium">Tercatat hadir pada: {scanResult.prevTime}</p>
              </>
            )}
            {scanResult.type === 'invalid' && (
              <>
                <p className="font-extrabold text-red-800 text-base">❌ QR Tidak Valid / Tidak Dikenali</p>
                <p className="text-xs text-red-600 mt-0.5">Pastikan QR Code berasal dari undangan MAPSI XXVII 2026.</p>
              </>
            )}
          </div>
          <button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Scanner Mode */}
      {mode === 'scanner' && (
        <div className="neo-card p-5 space-y-4 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                <ScanLine className="text-white" size={20} />
              </div>
              <div>
                <h2 className="font-extrabold text-sm" style={{ color: '#064e3b' }}>Scanner QR Code</h2>
                <p className="text-xs font-medium" style={{ color: 'rgba(5,150,105,0.7)' }}>Arahkan kamera ke QR Code tamu</p>
              </div>
            </div>

            {/* Camera actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {cameras.length > 1 && (
                <div className="relative flex items-center">
                  <SwitchCamera size={14} className="absolute left-2.5 text-emerald-700 pointer-events-none" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border bg-white cursor-pointer"
                    style={{ borderColor: 'rgba(5,150,105,0.25)', color: '#064e3b' }}
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Upload file fallback */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="neo-btn neo-btn-outline px-2.5 py-1.5 text-xs rounded-lg flex items-center gap-1"
                title="Scan dari Foto / Gambar QR"
              >
                <Upload size={13} />
                <span className="hidden sm:inline">Upload Gambar</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {isScanning && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-green-700">AKTIF</span>
                </div>
              )}
            </div>
          </div>

          {scannerError ? (
            <div className="p-4 rounded-xl text-sm font-medium"
              style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
              <AlertTriangle size={16} className="inline mr-2" />
              {scannerError}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => startScanner()}
                  className="neo-btn neo-btn-primary px-3 py-1.5 text-xs rounded-lg"
                >
                  Coba Lagi
                </button>
                <button
                  onClick={() => setMode('manual')}
                  className="neo-btn neo-btn-outline px-3 py-1.5 text-xs rounded-lg"
                >
                  Gunakan Check-in Manual
                </button>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-emerald-950 flex items-center justify-center" style={{ minHeight: '340px' }}>
              {/* Main scanner container */}
              <div
                id="qr-scanner-container"
                className="w-full h-full overflow-hidden rounded-xl"
              />

              {isProcessing && (
                <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-xs flex items-center justify-center z-30">
                  <div className="px-4 py-2 bg-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold text-emerald-800 animate-pulse">
                    <Sparkles size={16} className="text-emerald-600 animate-spin" />
                    Memverifikasi Kehadiran...
                  </div>
                </div>
              )}

              {!scannerReady && !scannerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-emerald-950/90 z-20">
                  <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-3"
                    style={{ borderColor: '#34d399', borderTopColor: 'transparent' }} />
                  <p className="font-bold text-sm text-emerald-300">Memulai kamera...</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.12)', color: 'rgba(5,150,105,0.8)' }}>
            <Info size={13} className="flex-shrink-0 mt-0.5 text-emerald-600" />
            <span>
              💡 <strong>Tips Scanning:</strong> Pastikan QR Code fokus dan tidak terlalu dekat ke lensa kamera. Jika menggunakan layar HP lain, redupkan kecerahan sedikit agar tidak silau/pantulan cahaya.
            </span>
          </div>
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <div className="neo-card p-5 space-y-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
              <Search className="text-white" size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-sm" style={{ color: '#064e3b' }}>Check-in Manual</h2>
              <p className="text-xs font-medium" style={{ color: 'rgba(5,150,105,0.7)' }}>Cari tamu berdasarkan nama, instansi, atau ID</p>
            </div>
          </div>

          <input
            id="input-manual-search"
            type="search"
            className="neo-input"
            placeholder="Ketik min. 2 karakter nama atau instansi..."
            value={manualSearch}
            onChange={(e) => setManualSearch(e.target.value)}
            autoFocus
          />

          {manualSearch.length >= 2 && (
            <div className="rounded-xl overflow-hidden divide-y"
              style={{ border: '1px solid rgba(5,150,105,0.15)', maxHeight: '320px', overflowY: 'auto' }}>
              {manualFiltered.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: 'rgba(5,150,105,0.5)' }}>
                  <p className="font-bold">Tamu tidak ditemukan</p>
                </div>
              ) : manualFiltered.map((guest) => {
                const { attendance } = useStore.getState();
                const isPresent = attendance.some((a) => a.guestId === guest.id && a.status === 'hadir');
                return (
                  <div key={guest.id} className="p-4 flex items-center gap-3 transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(5,150,105,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight" style={{ color: '#064e3b' }}>{guest.name}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(5,150,105,0.7)' }}>
                        {guest.institution} · {guest.position}
                      </p>
                    </div>
                    {isPresent ? (
                      <span className="neo-badge neo-badge-green flex-shrink-0"><UserCheck size={11} /> HADIR</span>
                    ) : (
                      <button
                        id={`btn-manual-${guest.id}`}
                        onClick={() => handleManualCheckin(guest.id)}
                        className="neo-btn neo-btn-primary px-3 py-1.5 text-xs rounded-lg flex-shrink-0"
                      >
                        <UserCheck size={13} /> Check-in
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {manualSearch.length === 0 && (
            <div className="p-8 text-center rounded-xl"
              style={{ background: 'rgba(5,150,105,0.04)', border: '1.5px dashed rgba(5,150,105,0.2)' }}>
              <Search size={28} className="mx-auto mb-2 opacity-30" style={{ color: '#059669' }} />
              <p className="font-bold text-sm" style={{ color: '#065f46' }}>Ketik nama tamu untuk mencari</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(5,150,105,0.5)' }}>Gunakan ini jika QR tidak bisa di-scan</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/dashboard/guests" className="neo-btn neo-btn-outline flex-1 py-2.5 text-sm rounded-lg">
          <QrCode size={14} /> Data Tamu
        </Link>
        <Link href="/dashboard/attendance" className="neo-btn neo-btn-outline flex-1 py-2.5 text-sm rounded-lg">
          <UserCheck size={14} /> Riwayat
        </Link>
      </div>
    </div>
  );
}
