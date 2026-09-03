/**
 * QR Code generation and parsing utilities
 * Optimized for high-contrast optical readability on all screens and paper.
 */
import QRCode from 'qrcode';

/** Generate a QR code as a data URL (base64 PNG) with maximum optical contrast */
export async function generateQRDataURL(
  invitationId: string,
  guestName: string
): Promise<string> {
  const payload = JSON.stringify({
    id: invitationId,
    name: guestName,
    event: 'MAPSI-XXVII-2026',
  });

  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M', // Medium error correction produces larger, easier-to-scan modules
    type: 'image/png',
    width: 800, // High-resolution render (800px) ensures crisp modules when printed
    margin: 2,
    color: {
      dark: '#000000', // Pure black provides maximum 21:1 optical contrast
      light: '#ffffff', // Pure white background
    },
  });

  return dataUrl;
}

/** Generate a QR code as an SVG string */
export async function generateQRSVG(invitationId: string, guestName: string): Promise<string> {
  const payload = JSON.stringify({
    id: invitationId,
    name: guestName,
    event: 'MAPSI-XXVII-2026',
  });

  const svg = await QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return svg;
}

/** 
 * Parse QR code payload string with high tolerance
 * Supports standard JSON payload, plain Invitation ID, or URLs
 */
export function parseQRPayload(raw: string): { id: string; name?: string; event?: string } | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // 1. Try parsing JSON object
  try {
    const parsed = JSON.parse(trimmed);
    const id = parsed.id || parsed.invitationId || parsed.invId;
    if (id) {
      return {
        id: String(id).trim(),
        name: parsed.name || '',
        event: parsed.event || 'MAPSI-XXVII-2026',
      };
    }
  } catch {
    // Not valid JSON, continue with pattern matching
  }

  // 2. Check for MAPSI invitation ID pattern (e.g. MAPSI-AA001, MAPSI-XXXXXXXX)
  const mapsiMatch = trimmed.match(/MAPSI-[A-Z0-9_-]+/i);
  if (mapsiMatch) {
    return {
      id: mapsiMatch[0].toUpperCase(),
      name: '',
      event: 'MAPSI-XXVII-2026',
    };
  }

  // 3. Check for UUID or seed IDs
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ||
      /^seed-\d+/i.test(trimmed) ||
      /^guest-/i.test(trimmed)) {
    return {
      id: trimmed,
      name: '',
      event: 'MAPSI-XXVII-2026',
    };
  }

  // 4. Fallback: return raw string if it has reasonable length
  if (trimmed.length > 0) {
    return {
      id: trimmed,
      name: '',
      event: 'MAPSI-XXVII-2026',
    };
  }

  return null;
}
