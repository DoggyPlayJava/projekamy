import { useState, useEffect, useRef, useCallback } from 'react';

export interface NanoTelemetry {
  temp?: number;
  hum?: number;
  hi?: number;
  light?: number;
  raw_ldr?: number;
  night?: boolean;
  buzzer?: boolean;
  buzzer_en?: boolean;
  reason?: string;
  uptime?: number;
}

export function useWebSerial(onTelemetry?: (data: NanoTelemetry) => void) {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [portName, setPortName] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepReadingRef = useRef(false);
  const onTelemetryRef = useRef(onTelemetry);

  useEffect(() => {
    onTelemetryRef.current = onTelemetry;
  }, [onTelemetry]);

  // Check Web Serial API support
  useEffect(() => {
    const supported = typeof navigator !== 'undefined' && 'serial' in (navigator as any);
    setIsSupported(supported);

    if (supported) {
      const handleDisconnect = (e: any) => {
        if (portRef.current && e.target === portRef.current) {
          disconnect();
        }
      };
      (navigator as any).serial.addEventListener('disconnect', handleDisconnect);
      return () => {
        (navigator as any).serial.removeEventListener('disconnect', handleDisconnect);
      };
    }
  }, []);

  // Disconnect from Arduino Nano
  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    try {
      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
        } catch {}
        try {
          readerRef.current.releaseLock();
        } catch {}
        readerRef.current = null;
      }
      if (portRef.current) {
        try {
          await portRef.current.close();
        } catch {}
        portRef.current = null;
      }
    } catch (err) {
      console.warn('[WebSerial] Ralat semasa menutup port:', err);
    } finally {
      setIsConnected(false);
      setPortName(null);
    }
  }, []);

  // Connect to Arduino Nano via Web Serial
  const connect = useCallback(async () => {
    setLastError(null);
    if (!('serial' in (navigator as any))) {
      setLastError('Pelayar web anda tidak menyokong Web Serial API. Sila gunakan Google Chrome atau Microsoft Edge.');
      return;
    }

    try {
      // If previous port or reader is still held, close it cleanly first
      if (portRef.current) {
        await disconnect();
      }

      // 1. Prompt user to select COM Port
      const port = await (navigator as any).serial.requestPort();

      // 2. Open port at 115200 baud
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      setPortName('Arduino Nano USB');
      keepReadingRef.current = true;

      // 3. Read stream directly without pipeTo to avoid locking issues
      const reader = port.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      const readLoop = async () => {
        try {
          while (keepReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // keep uncompleted line

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                  try {
                    const parsed: NanoTelemetry = JSON.parse(trimmed);
                    if (onTelemetryRef.current && (parsed.temp !== undefined || parsed.hum !== undefined)) {
                      onTelemetryRef.current(parsed);
                    }
                  } catch {
                    // Ignore malformed partial chunks
                  }
                }
              }
            }
          }
        } catch (err: any) {
          if (keepReadingRef.current) {
            console.warn('[WebSerial] Ralat membaca strim:', err);
            setLastError(err.message || 'Sambungan bersiri terputus.');
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {}
          readerRef.current = null;
          setIsConnected(false);
          setPortName(null);
        }
      };

      readLoop();
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        // User didn't just cancel the prompt
        console.error('[WebSerial] Gagal menyambung:', err);
        let friendlyMsg = err.message || 'Gagal membuka port USB.';
        const lower = friendlyMsg.toLowerCase();
        if (
          lower.includes('failed to open') ||
          lower.includes('access denied') ||
          err.name === 'NetworkError'
        ) {
          friendlyMsg =
            'Port COM sedang disekat atau digunakan oleh perisian lain (cth: Serial Monitor di Arduino IDE). Sila TUTUP Serial Monitor Arduino IDE terlebih dahulu, kemudian klik Sambung semula.';
        }
        setLastError(friendlyMsg);
      }
      setIsConnected(false);
      setPortName(null);
    }
  }, [disconnect]);

  // Send Command to Arduino Nano (e.g., TEST_BUZZER, MUTE, UNMUTE)
  const sendCommand = useCallback(async (cmd: string): Promise<boolean> => {
    if (!portRef.current || !portRef.current.writable) {
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const writer = portRef.current.writable.getWriter();
      await writer.write(encoder.encode(cmd.trim() + '\n'));
      writer.releaseLock();
      return true;
    } catch (err) {
      console.error('[WebSerial] Gagal menghantar arahan:', err);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    isSupported,
    isConnected,
    portName,
    lastError,
    clearError,
    connect,
    disconnect,
    sendCommand,
  };
}
