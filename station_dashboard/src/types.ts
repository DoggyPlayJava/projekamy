export interface WeatherStationStatus {
  id: number;
  moisture_pct: number;
  raw_moisture_adc: number;
  rain_detected: boolean;
  rain_intensity_pct: number;
  raw_rain_adc: number;
  light_pct: number;
  raw_ldr_adc: number;
  is_night: boolean;
  buzzer_active: boolean;
  buzzer_enabled: boolean;
  buzzer_reason: string;
  sensor_connected: boolean;
  updated_at: string;
}

export interface WeatherStationLog {
  id: number;
  moisture_pct: number;
  rain_intensity_pct: number;
  rain_detected: boolean;
  light_pct: number;
  is_night: boolean;
  buzzer_state: boolean;
  recorded_at: string;
}

export interface WeatherStationCommand {
  id: number;
  action: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  executed_at?: string;
}
