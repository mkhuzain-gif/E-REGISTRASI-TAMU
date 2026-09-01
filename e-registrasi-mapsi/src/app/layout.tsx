import type { Metadata, Viewport } from 'next';
import './globals.css';
import SupabaseProvider from '@/components/SupabaseProvider';

export const metadata: Metadata = {
  title: 'E-Registrasi Tamu Undangan | MAPSI XXVII Kedungtuban 2026',
  description:
    'Sistem Registrasi Digital Tamu Undangan MAPSI Tingkat Kecamatan Kedungtuban XXVII Tahun 2026. Absensi berbasis QR Code yang cepat, akurat, dan mudah dikelola panitia.',
  keywords: ['MAPSI', 'Kedungtuban', '2026', 'absensi', 'QR code', 'tamu undangan', 'registrasi'],
  authors: [{ name: 'Panitia MAPSI XXVII Kedungtuban 2026' }],
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'E-Registrasi MAPSI',
  },
  applicationName: 'E-Registrasi MAPSI',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1a6b3a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-brand-50 font-sans antialiased">
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
