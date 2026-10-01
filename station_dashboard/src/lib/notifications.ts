// =============================================================================
// notifications.ts — Modul Notifikasi & Push Notification Stesen Cuaca IoT
// Politeknik Sultan Haji Ahmad Shah (POLISAS)
// =============================================================================

export type WeatherNotificationType =
  | 'HEAT_ALERT'
  | 'DRY_AIR_ALERT'
  | 'BUZZER_ALERT'
  | 'SYSTEM_ALERT'
  | 'DAY_NIGHT_ALERT'
  | 'TEST_ALERT';

export interface WeatherNotification {
  id: string;
  title: string;
  message: string;
  type: WeatherNotificationType;
  severity: 'danger' | 'warning' | 'info' | 'success';
  is_read: boolean;
  created_at: string;
  value?: string | number;
}

// ─── Konfigurasi Lencana & Warna Modul ─────────────────────────────────────────
export const NOTIF_CONFIG: Record<
  WeatherNotificationType,
  { label: string; color: string; bgLight: string; bgDark: string; dot: string }
> = {
  HEAT_ALERT: {
    label: 'Amaran Gelombang Haba',
    color: '#e11d48', // rose-600
    bgLight: 'rgba(225, 29, 72, 0.12)',
    bgDark: 'rgba(225, 29, 72, 0.22)',
    dot: '#f43f5e',
  },
  DRY_AIR_ALERT: {
    label: 'Udara Sangat Kering',
    color: '#0284c7', // sky-600
    bgLight: 'rgba(2, 132, 199, 0.12)',
    bgDark: 'rgba(2, 132, 199, 0.22)',
    dot: '#0ea5e9',
  },
  BUZZER_ALERT: {
    label: 'Penggera Buzzer Aktif',
    color: '#f59e0b', // amber-600
    bgLight: 'rgba(245, 158, 11, 0.12)',
    bgDark: 'rgba(245, 158, 11, 0.22)',
    dot: '#fbbf24',
  },
  SYSTEM_ALERT: {
    label: 'Status Perkakasan ESP32',
    color: '#10b981', // emerald-600
    bgLight: 'rgba(16, 185, 129, 0.12)',
    bgDark: 'rgba(16, 185, 129, 0.22)',
    dot: '#34d399',
  },
  DAY_NIGHT_ALERT: {
    label: 'Kecerahan Cahaya Suria',
    color: '#8b5cf6', // violet-600
    bgLight: 'rgba(139, 92, 246, 0.12)',
    bgDark: 'rgba(139, 92, 246, 0.22)',
    dot: '#a78bfa',
  },
  TEST_ALERT: {
    label: 'Ujian Notifikasi Sistem',
    color: '#06b6d4', // cyan-600
    bgLight: 'rgba(6, 182, 212, 0.12)',
    bgDark: 'rgba(6, 182, 212, 0.22)',
    dot: '#22d3ee',
  },
};

// ─── Penjana Nada Audio Penggera (Web Audio API Synthesizer) ──────────────────
export function playAlertChime(severity: 'danger' | 'warning' | 'info' | 'success' = 'info'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (severity === 'danger') {
      // Rapid alert chime for extreme heat / buzzer: 880Hz -> 660Hz -> 880Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(660, now + 0.1);
      osc1.frequency.setValueAtTime(880, now + 0.2);

      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);
    } else {
      // Gentle pleasant chime: 523.25Hz (C5) -> 659.25Hz (E5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    console.warn('[Audio] Pelayar web menghadkan autoplay audio:', err);
  }
}

// ─── Permohonan Kebenaran Push Notification Pelayar Web ────────────────────────
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Pelayar web ini tidak menyokong Web Notification API.');
    return 'denied';
  }

  try {
    // Daftarkan Service Worker jika disokong
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('[Push SW] Service worker pendaftaran fallback:', e);
      });
    }

    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('[Push] Ralat semasa memohon kebenaran notifikasi:', err);
    return 'denied';
  }
}

// ─── Hantar Push Notification ke Sistem Operasi (Desktop / Telefon) ───────────
export function sendBrowserPush(title: string, body: string, tag?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const iconUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230ea5e9"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A7 7 0 0 1 5.07 11H5a1 1 0 0 1 0-2h.07A7 7 0 0 1 11 5.07V5a1 1 0 0 1 2 0v.07A7 7 0 0 1 18.93 11H19a1 1 0 0 1 0 2h-.07A7 7 0 0 1 13 16.93z"/></svg>';

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: iconUrl,
          badge: iconUrl,
          tag: tag || 'weather-alert',
          renotify: true,
        } as unknown as NotificationOptions);
      });
    } else {
      new Notification(title, {
        body,
        icon: iconUrl,
        tag: tag || 'weather-alert',
      });
    }
  } catch (err) {
    console.warn('[Push] Gagal memaparkan notifikasi:', err);
  }
}
