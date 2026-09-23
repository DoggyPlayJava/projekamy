// =============================================================================
// notifications.ts — Modul Utiliti Notifikasi & Push Notification Bersepadu
// Diadaptasi & dipermudahkan daripada arkitektur JPP-POLISAS untuk Sistem Pengairan Pintar
// =============================================================================

export type NotificationType = 'DRY_ALERT' | 'WATERING_START' | 'WATERING_END' | 'SYSTEM';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  pot_id?: number;
  pot_name?: string;
  is_read: boolean;
  created_at: string;
}

// ─── Konfigurasi Lencana Modul (Module Badges) ─────────────────────────────────
export const NOTIF_CONFIG: Record<
  NotificationType,
  { label: string; color: string; bg: string; dot: string }
> = {
  DRY_ALERT: {
    label: 'Amaran Tanah Kering',
    color: '#e11d48',
    bg: 'rgba(225, 29, 72, 0.12)',
    dot: '#f43f5e',
  },
  WATERING_START: {
    label: 'Pam Air Menyiram',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    dot: '#0ea5e9',
  },
  WATERING_END: {
    label: 'Siraman Selesai',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.12)',
    dot: '#10b981',
  },
  SYSTEM: {
    label: 'Sistem ESP32',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    dot: '#94a3b8',
  },
};

// ─── Permohonan Kebenaran Push Notification Pelayar Web ────────────────────────
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Pelayar web ini tidak menyokong Web Notification API.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('[Push] Ralat memohon kebenaran notifikasi:', err);
    return 'denied';
  }
}

// ─── Hantar Push Notification ke Sistem Operasi (Desktop / Telefon) ───────────
export function sendBrowserPush(title: string, body: string, tag?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    // Jika Service Worker bersedia, gunakan showNotification
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: tag || 'agro-notification',
          // Visual sahaja mengikut pilihan pengguna
        });
      });
    } else {
      // Fallback ke Web Notification API standard
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: tag || 'agro-notification',
      });
    }
  } catch (err) {
    console.warn('[Push] Gagal memaparkan notifikasi:', err);
  }
}
