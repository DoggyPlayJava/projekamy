# Pelan Pelaksanaan Pematuhan Penuh DEC30182 Mini Project (POLISAS)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menjadikan projek Stesen Cuaca Pintar Arduino Nano 100% mematuhi semua kriteria wajib dalam dokumen penilaian DEC30182 (Jabatan Kejuruteraan Elektrik, POLISAS) dengan mengintegrasikan External Interrupt (INT1), Timer Interrupt (Timer1), Output Kedua (LED Amaran Cuaca), kemaskini paparan OLED dan penyegerakan Web Dashboard.

**Architecture:** Sistem terbenam berasaskan mikropengawal ATmega328P dengan seni bina berasaskan sampukan (*interrupt-driven*). Input digital terdiri daripada DHT11 (D2) dan Suis Sampukan Luaran (D3/INT1), input analog ADC daripada LDR (A0), paparan status melalui OLED I2C (A4/A5), serta dwijenis peranti output fizikal: Audio (Buzzer D8) dan Visual (LED D7). Timer1 dikonfigurasi untuk pemasaan latar belakang, manakala UART 115200 bps menghubungkan mikropengawal ke Google Chrome Web Serial API.

**Tech Stack:**
- Microcontroller: Arduino Nano (ATmega328P, AVR Architecture)
- Peripherals: Hardware External Interrupt (INT1), Hardware Timer1 CTC Interrupt, ADC 10-bit, I²C TWI, UART Serial
- Sensors & Actuators: DHT11 (1-Wire digital), LDR (Analog), Piezo Buzzer (Active LOW), Red Warning LED, Pushbutton (INPUT_PULLUP)
- Libraries: `Wire.h`, `Adafruit_GFX.h`, `Adafruit_SSD1306.h`, `DHT.h`
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Web Serial API

## Global Constraints
- Pengekodan Arduino mestilah sifar-timbunan dinamik (*zero-heap allocation*) bagi menjamin kestabilan memori SRAM 2KB.
- Pin D2 dikhaskan untuk DHT11, Pin D3 untuk External Interrupt INT1 (Push Button), Pin D7 untuk LED Amaran, Pin D8 untuk Buzzer, Pin A0 untuk LDR, dan Pin A4/A5 untuk I²C OLED.
- Tiada perpustakaan luar berat dibenarkan untuk interrupt; gunakan perkakasan asli AVR (`attachInterrupt` dan register `TCCR1A`/`TCCR1B`/`TIMSK1`).
- Semua perubahan frontend TypeScript mestilah melepasi `npm run build` (`tsc -b && vite build`) dengan 0 ralat.

---

### Task 1: Integrasi Perkakasan Interrupt & LED dalam Kod Arduino Nano

**Files:**
- Modify: `arduino_nano_station/smart_weather_station_nano/smart_weather_station_nano.ino`

**Interfaces:**
- Consumes: Pin D3 (Pushbutton ke GND), Pin D7 (LED Anod melalui perintang 220Ω), Pin D8 (Buzzer Active LOW)
- Produces: 
  - `volatile bool emergencySnoozeActive` (dikawal oleh `handleEmergencyISR`)
  - `volatile unsigned long interruptCount` (bilangan sampukan luaran yang dikesan)
  - `bool ledActive` (status nyalaan LED dihantar dalam JSON telemetri UART)
  - `ISR(TIMER1_COMPA_vect)` (Timer1 1-Hz interrupt untuk degupan jam / heartbeat)

- [ ] **Step 1: Kemaskini definisi pin dan pembolehubah sampukan dalam sketch**
  Tambah `#define BUTTON_PIN 3` dan `#define LED_PIN 7`.
  Isytiharkan pembolehubah `volatile` untuk ISR dan pemasa Timer1.

- [ ] **Step 2: Konfigurasi perkakasan External Interrupt (INT1) & Timer1 dalam `setup()`**
  - Tetapkan `pinMode(BUTTON_PIN, INPUT_PULLUP)`.
  - Pasang `attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), handleEmergencyISR, FALLING)`.
  - Tetapkan `pinMode(LED_PIN, OUTPUT)`.
  - Konfigurasi Timer1 register AVR CTC mode pada 1 Hz:
    - `TCCR1A = 0;`
    - `TCCR1B = (1 << WGM12) | (1 << CS12) | (1 << CS10);` (Prescaler 1024)
    - `OCR1A = 15624;` (16MHz / 1024 - 1 = 15624 untuk tepat 1 saat)
    - `TIMSK1 |= (1 << OCIE1A);` (Dayakan Timer1 Compare Match Interrupt)

- [ ] **Step 3: Bina fungsi ISR (Interrupt Service Routine)**
  - `void handleEmergencyISR()`: memintas pemprosesan untuk menyenyapkan penggera (*Emergency Snooze*) serta-merta atau menukar mod ujian, dan meningkatkan `interruptCount`.
  - `ISR(TIMER1_COMPA_vect)`: pemasa perkakasan 1-saat beroperasi di latar belakang.

- [ ] **Step 4: Selaras logik dwi-output (LED + Buzzer) dalam `handleBuzzer()` dan `handleOutputs()`**
  Apabila keadaan cuaca melampau berlaku (suhu $\ge 35^\circ$C atau udara $<40\%$), kedua-dua LED (visual) dan Buzzer (audio) diaktifkan serentak.

- [ ] **Step 5: Kemaskini penstriman JSON UART untuk menyertakan `led` dan `int_count`**
  Strim `"led":true/false` dan `"int_cnt":interruptCount` dalam format JSON tanpa sebarang alokasi heap.

- [ ] **Step 6: Sahkan kompilasi Arduino dengan `arduino-cli`**
  Jalankan arahan kompilasi:
  `& "C:\Users\Cyborg 15\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" compile --fqbn arduino:avr:nano "c:\Users\Cyborg 15\Desktop\Project Amy\arduino_nano_station\smart_weather_station_nano"`
  Jangkaan: Exit code 0, Flash < 75%, Dynamic Memory < 45%.

- [ ] **Step 7: Commit perubahan sketch**
  ```bash
  git add arduino_nano_station/smart_weather_station_nano/smart_weather_station_nano.ino
  git commit -m "feat(nano): add INT1 external interrupt, Timer1 hardware interrupt, and LED dual output"
  ```

---

### Task 2: Kemaskini Paparan Fizikal OLED SSD1306 untuk Menunjukkan Status Interrupt & LED

**Files:**
- Modify: `arduino_nano_station/smart_weather_station_nano/smart_weather_station_nano.ino:90-145`

**Interfaces:**
- Consumes: `ledActive`, `interruptCount`, `emergencySnoozeActive`
- Produces: Visualisasi status perkakasan terbenam terus pada skrin fizikal 128x64.

- [ ] **Step 1: Reka bentuk semula baris status OLED (Baris 50-64)**
  Paparkan maklumat dwi-output dan interrupt pada skrin OLED:
  - Baris 54: `OUT: BZ+[LED] | INT:x`
  - Membuktikan kewujudan kedua-dua peranti output dan pemicu sampukan secara visual kepada pensyarah semasa sesi penilaian.

- [ ] **Step 2: Sahkan kompilasi Arduino dengan `arduino-cli`**
  Pastikan saiz bait dan penimbal I2C kekal stabil.

- [ ] **Step 3: Commit perubahan paparan OLED**
  ```bash
  git add arduino_nano_station/smart_weather_station_nano/smart_weather_station_nano.ino
  git commit -m "feat(nano): display LED status and interrupt counter on OLED screen"
  ```

---

### Task 3: Kemaskini Jenis Data & Web Serial Telemetri (Frontend)

**Files:**
- Modify: `station_dashboard/src/types.ts`
- Modify: `station_dashboard/src/hooks/useWebSerial.ts`
- Modify: `station_dashboard/src/App.tsx`

**Interfaces:**
- Consumes: JSON medan `"led"` dan `"int_cnt"` daripada Arduino Nano
- Produces: `WeatherStationStatus.led_active`, `WeatherStationStatus.interrupt_count`

- [ ] **Step 1: Kemaskini interface `WeatherStationStatus` dalam `types.ts`**
  Tambah `led_active?: boolean;` dan `interrupt_count?: number;`.

- [ ] **Step 2: Kemaskini interface `NanoTelemetry` dalam `useWebSerial.ts`**
  Tambah `led?: boolean;` dan `int_cnt?: number;`.

- [ ] **Step 3: Kemaskini `handleNanoTelemetry` dalam `App.tsx`**
  Petakan `data.led` ke `prev.led_active` dan `data.int_cnt` ke `prev.interrupt_count`.

- [ ] **Step 4: Uji binaan frontend dengan `npm run build`**
  Jalankan `npm run build` di dalam direktori `station_dashboard`.
  Jangkaan: 0 TypeScript errors.

- [ ] **Step 5: Commit perubahan jenis data frontend**
  ```bash
  git add station_dashboard/src/types.ts station_dashboard/src/hooks/useWebSerial.ts station_dashboard/src/App.tsx
  git commit -m "feat(dashboard): add led_active and interrupt_count telemetry support"
  ```

---

### Task 4: Visualisasi Dwi-Output (LED + Buzzer) & Penunjuk Interrupt dalam UI Dashboard

**Files:**
- Modify: `station_dashboard/src/components/WeatherCards.tsx`
- Modify: `station_dashboard/src/components/Header.tsx`

**Interfaces:**
- Consumes: `status.led_active`, `status.interrupt_count`, `status.buzzer_active`
- Produces: Kad metrik interaktif yang memaparkan status Output 1 (Buzzer D8), Output 2 (LED Amaran D7), dan Input Sampukan (Button D3/INT1).

- [ ] **Step 1: Kemaskini Kad 4 (Indeks Haba & Penggera) dalam `WeatherCards.tsx`**
  Tambah lencana dwi-output:
  - `Buzzer: Pin D8` (Audio)
  - `LED Amaran: Pin D7` (Visual)
  - Penunjuk Kiraan Sampukan: `INT1 Sampukan: x kali`

- [ ] **Step 2: Kemaskini Header untuk status mikropengawal**
  Paparkan label `Nano D2(DHT) • D3(INT) • D7(LED) • D8(BZ) • A0(LDR)` pada penerangan stesen.

- [ ] **Step 3: Uji binaan frontend dengan `npm run build`**
  Jalankan `npm run build`.
  Jangkaan: Binaan berjaya dengan 0 ralat.

- [ ] **Step 4: Commit pengemaskinian komponen UI**
  ```bash
  git add station_dashboard/src/components/WeatherCards.tsx station_dashboard/src/components/Header.tsx
  git commit -m "feat(ui): display dual outputs (Buzzer + LED) and hardware interrupt telemetry on dashboard"
  ```

---

### Task 5: Pengesahan Menyeluruh & Ujian Integrasi Sistem (*Full System Verification*)

**Files:**
- Verify: `arduino_nano_station/smart_weather_station_nano/smart_weather_station_nano.ino`
- Verify: `station_dashboard/`
- Test: Ujian kompilasi Arduino CLI dan ujian pembinaan web frontend

- [ ] **Step 1: Jalankan pengesahan kompilasi Arduino Nano**
  Arahan: `& "C:\Users\Cyborg 15\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" compile --fqbn arduino:avr:nano "c:\Users\Cyborg 15\Desktop\Project Amy\arduino_nano_station\smart_weather_station_nano"`
  Sahkan Flash < 75% dan RAM < 45%.

- [ ] **Step 2: Jalankan pengesahan binaan frontend Vite**
  Arahan: `npm run build` di dalam `station_dashboard`.
  Sahkan 0 ralat.

- [ ] **Step 3: Tolak semua perubahan ke repositori GitHub `master`**
  ```bash
  git push origin master
  ```

- [ ] **Step 4: Kemaskini ringkasan semakan pematuhan untuk pengguna**
  Sediakan senarai semakan akhir bagi sesi amali dan pembentangan viva DEC30182.
