# Smart Irrigation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membina sistem pengairan pintar lengkap untuk projek diploma POLISAS yang menggantikan paparan LCD dengan Papan Pemuka Web (Web Dashboard) Real-Time bertema pertanian hijau estetik (*Modern Glassmorphism Agro*), pangkalan data Supabase Realtime, firmware ESP32 (C++), serta panduan pendawaian breadboard fizikal tanpa pin extender.

**Architecture:** 
- **Database / Cloud Backend:** Supabase PostgreSQL dengan jadual `pot_status`, `moisture_logs`, `watering_logs`, dan `pump_commands`. Supabase Realtime WebSockets membolehkan website menerima dan memaparkan data langsung tanpa sebarang delay.
- **Frontend Web Dashboard:** Vite + React + Tailwind CSS + Lucide Icons + Supabase JS Client, menampilkan tolok bulatan animasi bagi 4 pasu tanaman, butang kawalan manual pam, suis auto/manual, pelaras ambang (*threshold slider*), graf sejarah kelembapan, dan log aktiviti masa nyata.
- **Hardware & Firmware:** ESP32 30-pin mengawal 4 sensor kelembapan tanah (ADC1 GPIO 32, 33, 34, 35) dan 4 relay pam mini 5V (GPIO 18, 19, 21, 22), disambung ke breadboard MB-102 dengan pengasingan punca kuasa (*Dual Power Rail & Common Ground*).

**Tech Stack:**
- ESP32 (Arduino C++, WiFi, HTTPClient, ArduinoJson)
- Supabase (PostgreSQL, Row Level Security, Realtime Publication, REST API)
- Vite + React 18 + TypeScript / JavaScript + Tailwind CSS + Lucide React + Canvas Confetti

## Global Constraints

- ESP32 ADC Pins: Mesti menggunakan pin ADC1 sahaja (GPIO 32, 33, 34, 35) untuk mengelakkan konflik dengan WiFi.
- Relay Module Logic: Active-LOW (`LOW` = Pam Hidup, `HIGH` = Pam Mati).
- Supabase Project URL: `https://adqhtjzbzeyiuzvdujnf.supabase.co`
- Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcWh0anpiemV5aXV6dmR1am5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNjg4MTAsImV4cCI6MjEwNTc0NDgxMH0.APe7LZp9h9waNWZYYdu-fYt1kvgmFNGCozBYE1nG3bc`
- Tema Visual: *Modern Glassmorphism Agro* (hijau zamrud `#059669` / `#10b981`, latar belakang mint lembut, kad kaca frosted blur).
- Bahasa Paparan: Dwibahasa (Bahasa Melayu & English) dengan penjenamaan rasmi POLISAS.

---

### Task 1: Supabase Database Schema Migration & Initialization

**Files:**
- Create: `database/schema.sql`
- Test: Verify tables via Supabase MCP `execute_sql` & `list_tables`

**Interfaces:**
- Produces: Tables `pot_status`, `moisture_logs`, `watering_logs`, `pump_commands` dengan Realtime publication & RLS policies.

- [ ] **Step 1: Write SQL migration file**

```sql
-- database/schema.sql
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

CREATE TABLE IF NOT EXISTS public.moisture_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pot_id INT NOT NULL REFERENCES public.pot_status(pot_id) ON DELETE CASCADE,
    moisture_pct INT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moisture_logs_pot_time ON public.moisture_logs(pot_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.watering_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pot_id INT NOT NULL REFERENCES public.pot_status(pot_id) ON DELETE CASCADE,
    pot_name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('AUTO', 'MANUAL')),
    duration_seconds INT NOT NULL DEFAULT 5,
    moisture_before INT,
    watered_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_watering_logs_time ON public.watering_logs(watered_at DESC);

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

-- Enable RLS
ALTER TABLE public.pot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moisture_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watering_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_commands ENABLE ROW LEVEL SECURITY;

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

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pot_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pump_commands;

-- Seed initial 4 pots
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
```

- [ ] **Step 2: Execute SQL migration in Supabase project `adqhtjzbzeyiuzvdujnf`**
- [ ] **Step 3: Verify tables created and seed rows present**
- [ ] **Step 4: Commit migration files**

---

### Task 2: Hardware Breadboard Guide & Circuit Schematics

**Files:**
- Create: `hardware/WIRING_GUIDE.md`
- Test: Verification against physical pinout specifications

**Interfaces:**
- Produces: Step-by-step breadboard assembly guide with ASCII schematic for 30-pin ESP32 on MB-102.

- [ ] **Step 1: Write comprehensive hardware assembly guide**
  - Detail ESP32 30-pin breadboard placement (Lajur E, leaving A–D open).
  - Detail DuPont jumper wiring for right-side GPIOs.
  - Detail Dual Power Supply (USB 5V for ESP32 + External 5V for Relay/Pumps) and Common Ground connection.
  - Detail 4 Soil Moisture Sensors wiring (VCC to 3V3, GND to GND, A0 to GPIO 32, 33, 34, 35).
  - Detail 4-Channel Relay wiring (VCC to Ext 5V, GND to Common GND, IN1-IN4 to GPIO 18, 19, 21, 22).
  - Detail 4 Mini Pumps wiring through Relay NO and COM terminals.
- [ ] **Step 2: Add testing & debugging checklist**
- [ ] **Step 3: Commit hardware documentation**

---

### Task 3: Production-Ready ESP32 Firmware

**Files:**
- Create: `esp32/smart_irrigation_esp32.ino`
- Test: Verification of syntax, pin mapping, REST API endpoints, and Active-LOW logic

**Interfaces:**
- Consumes: Supabase REST API endpoints (`/rest/v1/pot_status`, `/rest/v1/pump_commands`, `/rest/v1/watering_logs`)
- Produces: Periodic sensor telemetry, automated threshold watering, and remote manual pump execution.

- [ ] **Step 1: Write Arduino sketch `esp32/smart_irrigation_esp32.ino`**
  - Include `#include <WiFi.h>`, `#include <HTTPClient.h>`, `#include <WiFiClientSecure.h>`, `#include <ArduinoJson.h>`.
  - Configurable SSID & Password.
  - Supabase URL & Anon Key constants.
  - 10-sample ADC averaging filter for GPIO 32, 33, 34, 35.
  - Linear mapping function for moisture percentage: `map(adc, AIR_VAL, WATER_VAL, 0, 100)`.
  - Relay control functions with Active-LOW logic (`digitalWrite(pin, LOW)` = ON).
  - Automated watering function with 5s duration and 30s cooldown buffer per pot.
  - Function to sync pot status to Supabase via HTTPS PATCH.
  - Function to poll `pump_commands` for PENDING actions and execute immediately.
- [ ] **Step 2: Verify code structure and comments in Bahasa Melayu & English**
- [ ] **Step 3: Commit ESP32 firmware**

---

### Task 4: Web Dashboard Project Scaffolding & Setup

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/vite.config.ts`
- Create: `dashboard/tailwind.config.js`
- Create: `dashboard/src/lib/supabase.ts`
- Create: `dashboard/index.html`
- Test: `npm run build` succeeds

**Interfaces:**
- Produces: Ready-to-run React + Tailwind CSS dashboard scaffold with Supabase client configured.

- [ ] **Step 1: Scaffold Vite + React + TypeScript project in `dashboard/`**
- [ ] **Step 2: Install dependencies (`@supabase/supabase-js`, `lucide-react`, `canvas-confetti`, `clsx`, `tailwind-merge`)**
- [ ] **Step 3: Configure Tailwind CSS with Emerald/Glassmorphism theme**
- [ ] **Step 4: Configure Supabase client in `src/lib/supabase.ts`**
- [ ] **Step 5: Verify build passes (`npm run build`)**
- [ ] **Step 6: Commit dashboard scaffolding**

---

### Task 5: Web Dashboard Components & Supabase Realtime Integration

**Files:**
- Create: `dashboard/src/types.ts`
- Create: `dashboard/src/components/Header.tsx`
- Create: `dashboard/src/components/StatsOverview.tsx`
- Create: `dashboard/src/components/PotCard.tsx`
- Create: `dashboard/src/components/MoistureChart.tsx`
- Create: `dashboard/src/components/WateringLogTable.tsx`
- Create: `dashboard/src/App.tsx`
- Test: `npm run build` succeeds and UI renders flawlessly

**Interfaces:**
- Consumes: Supabase Realtime tables `pot_status`, `pump_commands`, `watering_logs`
- Produces: Interactive, responsive, aesthetic agriculture dashboard with live status gauges, manual pump trigger buttons, auto/manual toggles, and customizable plant names.

- [ ] **Step 1: Define TypeScript interfaces (`PotStatus`, `WateringLog`, `PumpCommand`) in `src/types.ts`**
- [ ] **Step 2: Implement `Header.tsx` with POLISAS branding, live heartbeat indicator, and dynamic clock**
- [ ] **Step 3: Implement `StatsOverview.tsx` KPI banner (Average moisture, active pumps, total watering, water tank status)**
- [ ] **Step 4: Implement `PotCard.tsx` with circular radial SVG meter, water wave ripple animation when watering, threshold slider, edit plant name inline, and "Siram Sekarang (5s)" manual button**
- [ ] **Step 5: Implement `MoistureChart.tsx` SVG/Canvas historical trend visualization**
- [ ] **Step 6: Implement `WateringLogTable.tsx` for real-time history of watering events**
- [ ] **Step 7: Connect `App.tsx` with Supabase Realtime subscription (`supabase.channel(...)`)**
- [ ] **Step 8: Verify build passes (`npm run build`)**
- [ ] **Step 9: Commit dashboard components**

---

### Task 6: System Verification, Documentation & Walkthrough

**Files:**
- Create: `README.md`
- Test: Full build and deployment readiness

- [ ] **Step 1: Test end-to-end integration by pushing test telemetry to Supabase and observing dashboard**
- [ ] **Step 2: Create project `README.md` with complete installation, flashing, and presentation instructions**
- [ ] **Step 3: Verify all code and documentation are committed cleanly**
