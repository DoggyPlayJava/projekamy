import { useState, useEffect, useRef, useCallback } from 'react';
import type { WeatherStationStatus } from '../types';
import type { WeatherNotification, WeatherNotificationType } from '../lib/notifications';
import {
  requestPushPermission,
  sendBrowserPush,
  playAlertChime,
} from '../lib/notifications';

const STORAGE_KEY = 'weather_station_notifications';

export function useWeatherNotifications(
  status: WeatherStationStatus,
  isStationOnline: boolean
) {
  const [notifications, setNotifications] = useState<WeatherNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  });

  const [latestToast, setLatestToast] = useState<WeatherNotification | null>(null);

  // References to track state changes and prevent notification spam
  const prevStatusRef = useRef<WeatherStationStatus | null>(null);
  const prevOnlineRef = useRef<boolean | null>(null);
  const lastAlertTimesRef = useRef<Map<string, number>>(new Map());

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 60)));
    } catch (e) {
      console.warn('Could not save weather notifications to storage:', e);
    }
  }, [notifications]);

  // Add new notification and fire push + sound
  const addNotification = useCallback(
    (notif: {
      title: string;
      message: string;
      type: WeatherNotificationType;
      severity: 'danger' | 'warning' | 'info' | 'success';
      value?: string | number;
    }) => {
      const newNotif: WeatherNotification = {
        ...notif,
        id: `weathernotif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev]);
      setLatestToast(newNotif);

      // Play audio chime
      playAlertChime(newNotif.severity);

      // Fire OS Desktop / Mobile Push Notification
      sendBrowserPush(newNotif.title, newNotif.message, newNotif.type);
    },
    []
  );

  // Monitor weather status transitions
  useEffect(() => {
    const prev = prevStatusRef.current;
    const now = Date.now();

    if (prev) {
      const temp = Number(status.temperature_c ?? 28);
      const heatIndex = Number(status.heat_index_c ?? temp);
      const humidity = Number(status.air_humidity_pct ?? 65);

      // 1. Extreme Heat Alert (Suhu >= 35°C atau Indeks Haba >= 38°C) - Debounce 2.5 min
      const isExtremeHeat = temp >= 35.0 || heatIndex >= 38.0 || status.heat_alert;
      const prevExtremeHeat = (prev.temperature_c ?? 28) >= 35.0 || (prev.heat_index_c ?? 28) >= 38.0 || prev.heat_alert;
      const lastHeatAlert = lastAlertTimesRef.current.get('HEAT') || 0;

      if (isExtremeHeat && (!prevExtremeHeat || now - lastHeatAlert > 150000)) {
        lastAlertTimesRef.current.set('HEAT', now);
        addNotification({
          type: 'HEAT_ALERT',
          severity: 'danger',
          title: '🚨 Amaran Gelombang Haba Melampau!',
          message: `Suhu mencapai ${temp.toFixed(1)}°C (Indeks Haba: ${heatIndex.toFixed(1)}°C). Risiko kelesuan & strok haba meningkat.`,
          value: `${temp.toFixed(1)}°C`,
        });
      }

      // 2. Dry Air Alert (Kelembapan Udara < 40%) - Debounce 2.5 min
      const isDry = humidity > 0 && humidity < 40;
      const prevDry = (prev.air_humidity_pct ?? 65) > 0 && (prev.air_humidity_pct ?? 65) < 40;
      const lastDryAlert = lastAlertTimesRef.current.get('DRY') || 0;

      if (isDry && (!prevDry || now - lastDryAlert > 150000)) {
        lastAlertTimesRef.current.set('DRY', now);
        addNotification({
          type: 'DRY_AIR_ALERT',
          severity: 'warning',
          title: '💨 Amaran Udara Sangat Kering',
          message: `Kelembapan udara berada pada tahap rendah (${humidity}% RH). Persekitaran kering dikesan.`,
          value: `${humidity}%`,
        });
      }

      // 3. Buzzer Activated (Hardware alarm sounding)
      if (!prev.buzzer_active && status.buzzer_active) {
        addNotification({
          type: 'BUZZER_ALERT',
          severity: 'danger',
          title: '🔊 Penggera Buzzer Sedang Berbunyi!',
          message: `Buzzer stesen cuaca telah diaktifkan (${status.buzzer_reason || 'AMARAN CUACA'}).`,
        });
      }
    }

    prevStatusRef.current = { ...status };
  }, [status, addNotification]);

  // Monitor ESP32 Online / Offline watchdog transitions
  useEffect(() => {
    if (prevOnlineRef.current !== null && prevOnlineRef.current !== isStationOnline) {
      if (isStationOnline) {
        addNotification({
          type: 'SYSTEM_ALERT',
          severity: 'success',
          title: '📡 Stesen Cuaca Kembali Dalam Talian (Online)',
          message: 'Sambungan telemetri mikropengawal ESP32 ke Supabase Cloud telah pulih sepenuhnya.',
        });
      } else {
        addNotification({
          type: 'SYSTEM_ALERT',
          severity: 'danger',
          title: '⚠️ ESP32 Stesen Cuaca Luar Talian (Offline)',
          message: 'Tiada isyarat telemetri dikesan dalam tempoh 90 saat. Sila semak bekalan kuasa atau sambungan hotspot WiFi.',
        });
      }
    }
    prevOnlineRef.current = isStationOnline;
  }, [isStationOnline, addNotification]);

  // Request browser push permission
  const handleRequestPermission = async () => {
    const res = await requestPushPermission();
    setPermission(res);
    if (res === 'granted') {
      addNotification({
        type: 'TEST_ALERT',
        severity: 'info',
        title: '🔔 Push Notifikasi Berjaya Diaktifkan!',
        message: 'Anda kini akan menerima pop-up amaran cuaca terus ke desktop atau telefon pintar.',
      });
    }
  };

  // Trigger test notification for demo
  const triggerTestNotification = () => {
    addNotification({
      type: 'TEST_ALERT',
      severity: 'info',
      title: '🧪 Ujian Push Notifikasi Cuaca POLISAS',
      message: 'Sistem notifikasi dan bunyi loceng beroperasi dengan sempurna pada pelayar anda.',
    });
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

  const dismissToast = () => {
    setLatestToast(null);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    permission,
    latestToast,
    dismissToast,
    requestPermission: handleRequestPermission,
    triggerTestNotification,
    markRead,
    markAllRead,
    clearAll,
  };
}
