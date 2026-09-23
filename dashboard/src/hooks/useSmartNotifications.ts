import { useState, useEffect, useRef, useCallback } from 'react';
import type { PotStatus } from '../types';
import type { AppNotification } from '../lib/notifications';
import {
  requestPushPermission,
  sendBrowserPush,
} from '../lib/notifications';

const STORAGE_KEY = 'agro_smart_notifications';

export function useSmartNotifications(
  pots: PotStatus[],
  isEsp32Online: boolean
) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  // References to track state changes
  const prevPotsRef = useRef<Map<number, PotStatus>>(new Map());
  const prevOnlineRef = useRef<boolean | null>(null);
  const lastAlertTimesRef = useRef<Map<number, number>>(new Map());

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch (e) {
      console.warn('Could not save notifications to storage:', e);
    }
  }, [notifications]);

  // Add new notification
  const addNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) => {
      const newNotif: AppNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev]);

      // Fire desktop/mobile push notification (Visual sahaja)
      sendBrowserPush(newNotif.title, newNotif.message);
    },
    []
  );

  // Monitor pots for dry alerts and watering events
  useEffect(() => {
    if (pots.length === 0) return;

    const now = Date.now();
    const prevMap = prevPotsRef.current;

    pots.forEach((pot) => {
      const prev = prevMap.get(pot.pot_id);

      if (prev) {
        // 1. Dry Soil Alert check (Debounced 3 minutes per pot)
        const isDry = pot.moisture_pct <= pot.threshold_pct;
        const wasDry = prev.moisture_pct <= prev.threshold_pct;
        const lastAlert = lastAlertTimesRef.current.get(pot.pot_id) || 0;

        if (isDry && (!wasDry || now - lastAlert > 180000)) {
          lastAlertTimesRef.current.set(pot.pot_id, now);
          addNotification({
            type: 'DRY_ALERT',
            pot_id: pot.pot_id,
            pot_name: pot.pot_name,
            title: `Amaran: ${pot.pot_name} Kering!`,
            message: `Kelembapan tanah berada pada ${pot.moisture_pct}% (kurang daripada had ${pot.threshold_pct}%).`,
          });
        }

        // 2. Pump Started Watering
        if (!prev.pump_state && pot.pump_state) {
          addNotification({
            type: 'WATERING_START',
            pot_id: pot.pot_id,
            pot_name: pot.pot_name,
            title: `Siraman Bermula: ${pot.pot_name}`,
            message: `Pam air pasu ${pot.pot_id} telah mula beroperasi untuk menyiram tanaman.`,
          });
        }

        // 3. Pump Stopped Watering
        if (prev.pump_state && !pot.pump_state) {
          addNotification({
            type: 'WATERING_END',
            pot_id: pot.pot_id,
            pot_name: pot.pot_name,
            title: `Siraman Selesai: ${pot.pot_name}`,
            message: `Kitaran penyiraman air untuk pasu ${pot.pot_id} telah berjaya disempurnakan.`,
          });
        }
      }

      // Update ref
      prevMap.set(pot.pot_id, { ...pot });
    });
  }, [pots, addNotification]);

  // Monitor ESP32 Online / Offline transitions
  useEffect(() => {
    if (prevOnlineRef.current !== null && prevOnlineRef.current !== isEsp32Online) {
      if (isEsp32Online) {
        addNotification({
          type: 'SYSTEM',
          title: 'ESP32 Kembali Dalam Talian (Online)',
          message: 'Komunikasi mikropengawal ESP32 dengan sistem cloud Supabase telah pulih.',
        });
      } else {
        addNotification({
          type: 'SYSTEM',
          title: 'ESP32 Berada Dalam Mod Standby / Terputus',
          message: 'Tiada isyarat detak jantung (heartbeat) baharu dikesan daripada perkakasan ESP32.',
        });
      }
    }
    prevOnlineRef.current = isEsp32Online;
  }, [isEsp32Online, addNotification]);

  // Request browser push permission
  const handleRequestPermission = async () => {
    const res = await requestPushPermission();
    setPermission(res);
    if (res === 'granted') {
      sendBrowserPush(
        'Notifikasi Pintar Diaktifkan!',
        'Anda akan menerima notifikasi segera apabila tanah kering atau siraman berlaku.'
      );
    }
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission: handleRequestPermission,
    markRead,
    markAllRead,
    clearAll,
  };
}
