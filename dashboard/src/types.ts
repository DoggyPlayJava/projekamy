export interface PotStatus {
  pot_id: number;
  pot_name: string;
  plant_type: string;
  moisture_pct: number;
  raw_adc: number;
  pump_state: boolean;
  auto_mode: boolean;
  threshold_pct: number;
  last_watered_at: string;
  updated_at: string;
}

export interface MoistureLog {
  id: number;
  pot_id: number;
  moisture_pct: number;
  recorded_at: string;
}

export interface WateringLog {
  id: number;
  pot_id: number;
  pot_name: string;
  trigger_type: 'AUTO' | 'MANUAL' | 'SCHEDULE';
  duration_seconds: number;
  moisture_before?: number;
  watered_at: string;
}

export interface PumpCommand {
  id: number;
  pot_id: number;
  action: string;
  duration_seconds: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  executed_at?: string;
}

export interface IrrigationSchedule {
  id: number;
  label: string;
  time_of_day: string; // e.g. "08:00:00"
  target_pots: number[]; // e.g. [1, 2, 3, 4]
  duration_seconds: number;
  skip_if_wet: boolean;
  is_enabled: boolean;
  last_executed_at?: string;
  created_at: string;
}
