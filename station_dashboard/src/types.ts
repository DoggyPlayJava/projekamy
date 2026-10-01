export interface WeatherStationStatus {
  id: number;
  temperature_c: number;
  air_humidity_pct: number;
  heat_alert?: boolean;
  moisture_pct: number;
  raw_moisture_adc: number;
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
  temperature_c: number;
  air_humidity_pct: number;
  moisture_pct: number;
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
