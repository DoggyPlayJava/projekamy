export interface WeatherStationStatus {
  id: number;
  temperature_c: number;
  air_humidity_pct: number;
  heat_index_c?: number;
  heat_alert?: boolean;
  light_pct: number;
  raw_ldr_adc: number;
  is_night: boolean;
  buzzer_active: boolean;
  buzzer_enabled: boolean;
  led_active?: boolean;
  interrupt_count?: number;
  buzzer_reason: string;
  sensor_connected: boolean;
  updated_at: string;
}

export interface WeatherStationLog {
  id: number;
  temperature_c: number;
  air_humidity_pct: number;
  heat_index_c?: number;
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
