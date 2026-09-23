# Design Specification: Smart Irrigation System (Sistem Pengairan Pintar)

**Project:** Sistem Pengairan Pintar (Smart Irrigation System)  
**Institution:** Politeknik Sultan Haji Ahmad Shah (POLISAS) — Jabatan Kejuruteraan Mekanikal  
**Date:** 2026-09-23  
**Status:** Approved by User  

---

## 1. Executive Summary & Objective

Projek ini mentransformasikan sistem pengairan konvensional (berasaskan paparan LCD fizikal) kepada **Sistem Pengairan Pintar Bersepadu IoT** berasaskan mikropengawal **ESP32** dan **Papan Pemuka Web (Web Dashboard) Real-Time Estetik** yang dihubungkan terus ke cloud database **Supabase**.

Sistem ini memantau 4 pasu tanaman secara individu menggunakan 4 sensor kelembapan tanah, mengawal 4 pam air mini submersible melalui 4-channel relay module, menyalurkan data secara langsung ke Supabase melalui protokol HTTPS, serta memaparkan data dan membenarkan kawalan manual dua hala secara masa nyata melalui web dashboard yang bertema pertanian moden (Modern Emerald Glassmorphism).

---

## 2. Hardware Architecture & Breadboard Pinout

### 2.1 Cabaran Fizikal & Solusi Breadboard (Tanpa Pin Extender)
Papan pembangunan **ESP32 NodeMCU 30-pin** mempunyai kelebaran ~0.9 inci. Apabila dicucuk merentangi parit tengah (*center divider*) pada papan reka (breadboard MB-102), satu sisi (biasanya sisi kiri) mempunyai 3 hingga 4 lubang terbuka pada setiap baris (lajur A–D), manakala sisi kanan menduduki lajur paling tepi (lajur J) sehingga tiada lubang kosong berbaki di sisi itu.

#### Solusi Pemasangan Terperinci:
1. **Pemasangan Sisi Kiri (Sensor & Input)**:
   - Sisi kiri ESP32 dicucuk pada lajur E. Ini meninggalkan lajur A, B, C, dan D untuk sambungan wayar pin 3.3V, GND, serta pin analog sensor ADC1 (GPIO 32, 33, 34, 35).
2. **Pemasangan Sisi Kanan (Relay & Output)**:
   - Gunakan wayar jumper **Female-to-Male (DuPont)** yang dicucuk terus ke pin header ESP32 di sisi kanan sebelum ESP32 ditekan kemas pada breadboard, **ATAU** masukkan pin jumper male ke lajur F di bawah badan ESP32 sebelum memasang papan tersebut.
3. **Konfigurasi Dwi-Punca Kuasa (Dual Power Supply)**:
   - **Punca Kuasa 1 (ESP32 Logic & Sensor)**: Dikuasakan melalui kabel Micro-USB dari laptop/adapter 5V. Pin `3V3` ESP32 menyalurkan 3.3V ke rel kuasa atas breadboard untuk 4 sensor tanah.
   - **Punca Kuasa 2 (Pam Air & Relay 5V)**: Dikuasakan melalui adapter/power bank 5V berasingan yang disambung terus ke rel kuasa bawah breadboard.
   - **PENYATUAN GROUND (Common Ground — KRITIKAL)**: Pin `GND` ESP32 disambungkan ke rel `GND` punca kuasa 5V pam pada breadboard. Ini memastikan aras rujukan voltan isyarat relay adalah seimbang dan mengelakkan ESP32 daripada restart (*brownout*) akibat hentakan arus pam air.

---

### 2.2 Pemetaan Pin (Pin Assignment Table)

| Komponen | Pin Modul | Pin ESP32 | Jenis Pin & Peranan |
| :--- | :--- | :--- | :--- |
| **Sensor Pasu 1** | A0 (Analog) | **GPIO 32** | ADC1_CH4 (Input Analog 12-bit, Selamat dengan WiFi) |
| **Sensor Pasu 2** | A0 (Analog) | **GPIO 33** | ADC1_CH5 (Input Analog 12-bit, Selamat dengan WiFi) |
| **Sensor Pasu 3** | A0 (Analog) | **GPIO 34** | ADC1_CH6 (Input Analog Sahaja) |
| **Sensor Pasu 4** | A0 (Analog) | **GPIO 35** | ADC1_CH7 (Input Analog Sahaja) |
| **Relay Channel 1** | IN1 (Pam 1) | **GPIO 18** | Output Digital (Active-LOW: `LOW` = Pam ON, `HIGH` = OFF) |
| **Relay Channel 2** | IN2 (Pam 2) | **GPIO 19** | Output Digital (Active-LOW) |
| **Relay Channel 3** | IN3 (Pam 3) | **GPIO 21** | Output Digital (Active-LOW) |
| **Relay Channel 4** | IN4 (Pam 4) | **GPIO 22** | Output Digital (Active-LOW) |
| **Status LED** | Onboard LED | **GPIO 2** | Penunjuk Sambungan WiFi (Blink = Searching, Solid = Connected) |
| **Sensor VCC (4x)**| VCC | **ESP32 3V3** | Rel Kuasa 3.3V Breadboard |
| **Sensor GND (4x)**| GND | **ESP32 GND** | Rel Common GND Breadboard |
| **Relay VCC** | VCC | **External 5V** | Rel Kuasa Luaran 5V Breadboard |
| **Relay GND** | GND | **Common GND** | Rel Common GND Breadboard |
| **Pam Air (4x)** | V+ (Merah) | **Relay NO** | Disambung melalui terminal NO (Normally Open) relay |
| **Relay COM (4x)** | COM | **External 5V** | Punca 5V positif ke pam apabila relay ditutup |
| **Pam Air (4x)** | V- (Hitam) | **Common GND** | Terus ke Rel Common GND |

---

## 3. Database Schema & Supabase Architecture

**Supabase Project Ref:** `adqhtjzbzeyiuzvdujnf`  
**API Endpoint:** `https://adqhtjzbzeyiuzvdujnf.supabase.co`  

### 3.1 Struktur Jadual (Database Tables)

#### A. Jadual `pot_status` (Status Semasa 4 Pasu & Kawalan)
```sql
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
```

#### B. Jadual `moisture_logs` (Data Sejarah Masa untuk Graf Analitik)
```sql
CREATE TABLE IF NOT EXISTS public.moisture_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pot_id INT NOT NULL REFERENCES public.pot_status(pot_id) ON DELETE CASCADE,
    moisture_pct INT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moisture_logs_pot_time ON public.moisture_logs(pot_id, recorded_at DESC);
```

#### C. Jadual `watering_logs` (Rekod Sejarah Setiap Sesi Siraman)
```sql
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
```

#### D. Jadual `pump_commands` (Antara Muka Kawalan Dua Hala Web ke ESP32)
```sql
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
```

### 3.2 Supabase Realtime & Keselamatan RLS
- Mengaktifkan `supabase_realtime` publication pada `pot_status` dan `pump_commands`.
- Polisi RLS (Row Level Security) membenarkan capaian pembacaan (SELECT) dan kemaskini (INSERT/UPDATE) untuk `anon` role (digunakan oleh ESP32 melalui REST API dan Web Client).

---

## 4. Web Dashboard UI/UX Specification

### 4.1 Tema Reka Bentuk (Visual Aesthetic)
- **Gaya:** *Modern Glassmorphism Agro* (Light Emerald & Frosted Glass).
- **Palet Warna:**
  - Latar Belakang: `#f4f9f4` hingga `#e8f5e9` (gradient hijau pudina lembut dan segar).
  - Kad & Panel: `rgba(255, 255, 255, 0.75)` dengan `backdrop-filter: blur(16px)` dan garisan sempadan halus `border-emerald-100`.
  - Warna Utama (Primary): Zamrud `#059669` / `#10b981` (Emerald).
  - Aksen Status:
    - Lembap / Selesa: `#10b981` (Emerald Green)
    - Sederhana: `#f59e0b` (Amber)
    - Kering / Perlu Siram: `#ef4444` (Rose/Red)
    - Pam Aktif (Sedang Menyiram): `#0284c7` (Sky Blue animasi riak air)

### 4.2 Komponen Papan Pemuka (Dashboard Modules)
1. **Header Rasmi & Status Sambungan**:
   - Tajuk: **SISTEM PENGAIRAN PINTAR**
   - Subtajuk: *Politeknik Sultan Haji Ahmad Shah (POLISAS) — Jabatan Kejuruteraan Mekanikal*
   - Badges: `● ESP32 Live` (berkedip hijau jika data aktif dalam masa 30 saat yang lalu) & `● Supabase Realtime Connected`.
   - Jam Semasa & Tarikh dinamik.
2. **Banner Ringkasan Metrik (KPI Bar)**:
   - Purata Kelembapan 4 Pasu (contoh: 68% - Kondisi Baik)
   - Status Pam (cth: "0 daripada 4 sedang menyiram")
   - Jumlah Siraman Hari Ini (cth: "8 Sesi")
   - Tahap Keselamatan Tangki Air ("Air Bersih Tersedia")
3. **4 Kad Pasu Tanaman Interaktif (The 4-Pot Grid)**:
   - Nama Pasu boleh diedit terus (klik ikon pensel: "Pasu 1 (Sawi)", "Pasu 2 (Salad)", dll).
   - **Tolok Bulatan Kelembapan Dinamik (Circular Radial Gauge)**: Memaparkan peratus kelembapan 0-100% dengan kod warna automatik mengikut tahap tanah.
   - Status Teks: "Tanah Basah / Sesuai" atau "Tanah Kering (Perlu Air)".
   - **Kawalan Ambang (Threshold Slider)**: Slider interaktif (10% - 80%) untuk menetapkan bila pam automatik harus menyiram.
   - **Suis Mod Auto / Manual**: Toggle switch untuk mengaktifkan siraman pintar automatik bagi pasu tersebut.
   - **Butang Pantas "Siram Sekarang (5s)"**: Menghantar arahan ke `pump_commands` dengan animasi titisan air berombak.
   - Timestamp Masa Siraman Terakhir (contoh: "10 minit yang lalu").
4. **Graf Analitik Garis Sejarah Kelembapan (Line Chart Analytics)**:
   - Menggunakan komponen carta interaktif yang memaparkan trend kelembapan tanah keempat-empat pasu bagi tempoh terkini.
   - Tooltip interaktif memaparkan nilai tepat bila kursor diletakkan di atas graf.
5. **Jadual Log Sejarah Siraman (Recent Watering Log Table)**:
   - Memaparkan rekod 10 siraman terkini: Tarikh/Masa, Nama Pasu, Kaedah (Automatik / Manual Web), Tempoh (saat), dan Status.
6. **Kesesuaian Responsif (Responsive Mobile & Desktop)**:
   - Paparan tersusun rapi di skrin telefon pintar (1 kolum kad) dan skrin komputer riba/skrin besar (2x2 grid atau 4 kolum selari).

---

## 5. ESP32 Firmware Architecture & Logic

### 5.1 Aliran Operasi Firmware (Arduino C++)
1. **Inisialisasi**:
   - Mengkonfigurasi pin relay (GPIO 18, 19, 21, 22) sebagai `OUTPUT` dan tetapkan `HIGH` (Relay OFF).
   - Mengkonfigurasi pin sensor (GPIO 32, 33, 34, 35) sebagai `INPUT`.
   - Menyambungkan ESP32 ke rangkaian WiFi dengan mekanisme auto-reconnect.
2. **Pembacaan Sensor & Penapisan Hingar (Sampling & Smoothing)**:
   - Setiap kitaran bacaan mengambil 10 sampel analog untuk setiap pin dan dikira nilai purata.
   - Nilai ADC ditukarkan kepada peratusan kelembapan (0% - 100%) menggunakan formula penentukuran:
     ```cpp
     int moisturePct = map(rawVal, AIR_VALUE, WATER_VALUE, 0, 100);
     moisturePct = constrain(moisturePct, 0, 100);
     ```
3. **Logik Siraman Automatik**:
   - Jika `auto_mode == true` dan `moisture_pct <= threshold_pct`:
     - Pam pasu diaktifkan (`digitalWrite(relayPin, LOW)`).
     - Pam berjalan selama 5 saat.
     - Pam dimatikan (`digitalWrite(relayPin, HIGH)`).
     - Merekodkan siraman ke jadual `watering_logs` di Supabase.
     - Melaksanakan masa rehat (*cooldown buffer*) selama 30 saat sebelum pasu yang sama dinilai semula bagi membolehkan air meresap ke dalam tanah.
4. **Penyelarasan Data & Kawalan Manual (Supabase REST API)**:
   - Menghantar data kelembapan dan status pam semasa ke endpoint `/rest/v1/pot_status` menggunakan HTTP `PATCH`/`POST`.
   - Memeriksa jadual `pump_commands` untuk sebarang rekod berstatus `PENDING`. Jika ada, laksanakan pam pasu yang diminta selama 5 saat dan kemaskini status arahan kepada `COMPLETED`.

---

## 6. Verification & Quality Assurance Plan

1. **Ujian Pangkalan Data Supabase**:
   - Membina jadual, indeks, dan polisi RLS melalui arahan SQL Supabase.
   - Mengesahkan 4 baris rekod asas bagi Pasu 1–4 wujud dan sedia menerima data.
2. **Ujian Website Dashboard**:
   - Membina aplikasi Vite + React + Tailwind CSS.
   - Menguji langganan WebSocket Supabase Realtime (perubahan data di DB terpapar terus di UI).
   - Menguji butang manual "Siram Sekarang" menghantar rekod ke `pump_commands`.
   - Menguji fungsi penyuntingan nama pasu dan pelarasan slider threshold.
3. **Ujian Kod ESP32**:
   - Menyediakan kod `.ino` yang lengkap, bersih, beranotasi Bahasa Melayu/Inggeris dengan struktur pembolehubah yang jelas (mudah diisi SSID, Password, dan Supabase URL/Key).
   - Menyertakan rajah skematik ASCII dan panduan pendawaian breadboard yang jelas untuk rujukan semasa pemasangan litar fizikal.
