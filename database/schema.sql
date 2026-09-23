-- ====================================================================
-- SMART IRRIGATION SYSTEM (SISTEM PENGAIRAN PINTAR)
-- POLITEKNIK SULTAN HAJI AHMAD SHAH (POLISAS)
-- Supabase PostgreSQL Schema Migration
-- ====================================================================

-- 1. Table: pot_status
-- Stores current real-time telemetry, auto-mode state, and threshold per pot
CREATE TABLE IF NOT EXISTS public.pot_status (
    pot_id INT PRIMARY KEY,
    pot_name TEXT NOT NULL,
    plant_type TEXT DEFAULT 'Sayuran',
    moisture_pct INT NOT NULL DEFAULT 50 CHECK (moisture_pct >= 0 AND moisture_pct <= 100),
    raw_adc INT DEFAULT 2000,
    pump_state BOOLEAN NOT NULL DEFAULT false,
    auto_mode BOOLEAN NOT NULL DEFAULT true,
    threshold_pct INT NOT NULL DEFAULT 35 CHECK (threshold_pct >= 10 AND threshold_pct <= 90),
    last_watered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: moisture_logs
-- Stores time-series historical data for graphical trend analytics
CREATE TABLE IF NOT EXISTS public.moisture_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pot_id INT NOT NULL REFERENCES public.pot_status(pot_id) ON DELETE CASCADE,
    moisture_pct INT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moisture_logs_pot_time ON public.moisture_logs(pot_id, recorded_at DESC);

-- 3. Table: watering_logs
-- Records every automatic, manual, or scheduled watering event
CREATE TABLE IF NOT EXISTS public.watering_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pot_id INT NOT NULL REFERENCES public.pot_status(pot_id) ON DELETE CASCADE,
    pot_name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('AUTO', 'MANUAL', 'SCHEDULE')),
    duration_seconds INT NOT NULL DEFAULT 5,
    moisture_before INT,
    watered_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_watering_logs_time ON public.watering_logs(watered_at DESC);

-- 4. Table: pump_commands
-- Bidirectional queue for manual web override commands to ESP32
CREATE TABLE IF NOT EXISTS public.pump_commands (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pot_id INT NOT NULL,
    action TEXT NOT NULL DEFAULT 'WATER_NOW',
    duration_seconds INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pump_commands_status ON public.pump_commands(status, created_at ASC);

-- 5. Table: irrigation_schedules
-- Smart timer schedule manager with Smart Skip (langkau jika basah)
CREATE TABLE IF NOT EXISTS public.irrigation_schedules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label TEXT NOT NULL,
    time_of_day TIME NOT NULL,
    target_pots INT[] NOT NULL DEFAULT '{1,2,3,4}',
    duration_seconds INT NOT NULL DEFAULT 5,
    skip_if_wet BOOLEAN NOT NULL DEFAULT true,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Row Level Security (RLS) configuration
ALTER TABLE public.pot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moisture_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watering_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_schedules ENABLE ROW LEVEL SECURITY;

-- Allow public anon read/write for IoT integration
CREATE POLICY "Allow public read pot_status" ON public.pot_status FOR SELECT USING (true);
CREATE POLICY "Allow public update pot_status" ON public.pot_status FOR UPDATE USING (true);
CREATE POLICY "Allow public insert pot_status" ON public.pot_status FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read moisture_logs" ON public.moisture_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert moisture_logs" ON public.moisture_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read watering_logs" ON public.watering_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert watering_logs" ON public.watering_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read pump_commands" ON public.pump_commands FOR SELECT USING (true);
CREATE POLICY "Allow public insert pump_commands" ON public.pump_commands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update pump_commands" ON public.pump_commands FOR UPDATE USING (true);

CREATE POLICY "Allow public read irrigation_schedules" ON public.irrigation_schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert irrigation_schedules" ON public.irrigation_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update irrigation_schedules" ON public.irrigation_schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete irrigation_schedules" ON public.irrigation_schedules FOR DELETE USING (true);

-- 7. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.pot_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pump_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.irrigation_schedules;

-- 8. Seed Initial 4 Pots
INSERT INTO public.pot_status (pot_id, pot_name, plant_type, moisture_pct, raw_adc, pump_state, auto_mode, threshold_pct)
VALUES 
    (1, 'Pasu 1 (Sawi Hijau)', 'Sawi', 55, 2100, false, true, 35),
    (2, 'Pasu 2 (Salad Bulat)', 'Salad', 42, 2450, false, true, 35),
    (3, 'Pasu 3 (Kangkung)', 'Kangkung', 28, 2900, false, true, 30),
    (4, 'Pasu 4 (Bayam Merah)', 'Bayam', 65, 1850, false, true, 35)
ON CONFLICT (pot_id) DO UPDATE SET
    pot_name = EXCLUDED.pot_name,
    plant_type = EXCLUDED.plant_type,
    updated_at = NOW();

-- 9. Seed Initial Schedules
INSERT INTO public.irrigation_schedules (label, time_of_day, target_pots, duration_seconds, skip_if_wet, is_enabled)
VALUES
    ('Siraman Pagi', '08:00:00', '{1,2,3,4}', 5, true, true),
    ('Siraman Petang', '17:30:00', '{1,2,3,4}', 5, true, true)
ON CONFLICT DO NOTHING;

-- 10. Seed Initial Sample Logs for immediate dashboard visualization
INSERT INTO public.watering_logs (pot_id, pot_name, trigger_type, duration_seconds, moisture_before, watered_at)
VALUES
    (1, 'Pasu 1 (Sawi Hijau)', 'AUTO', 5, 25, NOW() - INTERVAL '4 hours'),
    (2, 'Pasu 2 (Salad Bulat)', 'MANUAL', 5, 28, NOW() - INTERVAL '2 hours'),
    (3, 'Pasu 3 (Kangkung)', 'SCHEDULE', 5, 22, NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO public.moisture_logs (pot_id, moisture_pct, recorded_at)
VALUES
    (1, 45, NOW() - INTERVAL '3 hours'),
    (1, 50, NOW() - INTERVAL '2 hours'),
    (1, 55, NOW() - INTERVAL '1 hour'),
    (2, 38, NOW() - INTERVAL '3 hours'),
    (2, 40, NOW() - INTERVAL '2 hours'),
    (2, 42, NOW() - INTERVAL '1 hour'),
    (3, 22, NOW() - INTERVAL '3 hours'),
    (3, 25, NOW() - INTERVAL '2 hours'),
    (3, 28, NOW() - INTERVAL '1 hour'),
    (4, 60, NOW() - INTERVAL '3 hours'),
    (4, 62, NOW() - INTERVAL '2 hours'),
    (4, 65, NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;
