# Sistem Pengairan Pintar (Smart Irrigation System) IoT Bersepadu
### Politeknik Sultan Haji Ahmad Shah (POLISAS) — Jabatan Kejuruteraan Mekanikal

Projek ini merupakan transformasi lengkap daripada sistem pengairan konvensional (yang asalnya menggunakan paparan fizikal LCD 16x2) kepada **Sistem Pengairan Pintar Bersepadu Berasaskan Cloud IoT**. Sistem ini memantau 4 pasu tanaman secara berasingan menggunakan mikropengawal **ESP32**, pangkalan data cloud **Supabase (PostgreSQL + Realtime)**, serta sebuah **Papan Pemuka Web (Web Dashboard) Real-Time Estetik** bertema pertanian moden (*Modern Glassmorphism Agro*).

---

## 🌟 Ciri-Ciri Utama Sistem

1. **Papan Pemuka Web Estetik & Moden (Menggantikan LCD)**:
   - Reka bentuk *Modern Glassmorphism Agro* dengan tona hijau zamrud (*emerald*), latar belakang mint segar, dan kad kaca bertekstur *blur*.
   - **Tolok Bulatan Beranimasi (Circular Radial Gauge)** untuk setiap 4 pasu (kod warna automatik: Hijau = Lembap, Kuning = Sederhana, Merah = Kering).
   - **Kemaskini Langsung (Zero-Reload Realtime)**: Data disegerakkan secara langsung melalui WebSocket Supabase tanpa perlu menekan butang *refresh*.
   - **Kawalan Dua Hala (Bidirectional Control)**: Butang pantas *"Siram Sekarang (5 saat)"* dan suis *"Mod Auto/Manual"* bagi setiap pasu dari web ke ESP32.
   - **Pelaras Ambang (Threshold Slider)**: Laraskan peratus kelembapan minimum (15%–75%) terus dari web untuk menentukan bila pam automatik harus menyiram.
   - **Sistem Notifikasi & Web Push (Diadaptasi daripada JPP-POLISAS)**:
     - Ikon **Loceng Notifikasi (Notification Bell)** dengan lencana kiraan amaran belum dibaca (*unread count badge*).
     - **Push Notification Pelayar (Visual Pop-up)**: Meminta kebenaran daripada pelayar web dan menghantar notifikasi terus ke desktop/telefon pintar apabila tanah kering atau semasa pam mula/selesai menyiram.
   - **Penjadualan Masa Pintar (Smart Irrigation Scheduler)**:
     - Tetapkan jadual siraman berkala automatik (contoh: Sesi Pagi 08:00 AM dan Sesi Petang 05:30 PM).
     - Dilengkapi ciri **Smart Skip (*Langkau Jika Tanah Basah*)** yang bijak melangkau siraman jika tanah pasu sudah lembap melebihi had ambang bagi mengelakkan pembaziran air dan kerosakan akar tanaman.
     - Pilihan memilih pasu sasaran, tempoh masa siraman (saat), dan butang *"Uji Sekarang"* untuk pengesahan segera.
   - **Graf Garis Sejarah Analitik**: Memantau trend kelembapan tanah mengikut masa.
   - **Jadual Log Sejarah Siraman**: Menyimpan rekod lengkap tarikh, masa, punca (Auto Sensor vs Manual Web vs Jadual Waktu), dan tempoh siraman.
   - **Mod Simulator Demo**: Butang khas untuk pelajar mensimulasikan tanah kering atau pam aktif semasa sesi pembentangan/viva FYP.

2. **Pendawaian Breadboard Selamat (Tanpa Pin Extender)**:
   - Panduan praktikal mengatasi saiz ESP32 30-pin pada breadboard MB-102 menggunakan kaedah wayar DuPont *Female-to-Male*.
   - Pemilihan pin selamat **ADC1 (GPIO 32, 33, 34, 35)** untuk mengelakkan sebarang gangguan dengan fungsi WiFi ESP32.
   - Konfigurasi **Dwi-Punca Kuasa (Dual Power Supply)** & **Common Ground** bagi melindungi ESP32 daripada terpadam (*brownout*) akibat hentakan arus motor 4 pam air.

3. **Firmware ESP32 Termaju (Arduino C++)**:
   - Penapisan hingar ADC (*10-sample averaging smoothing*).
   - Penentukuran formula 0% hingga 100% kelembapan tanah.
   - Pemasa selamat tanpa sekatan (*non-blocking timer*) dengan *cooldown buffer* 30 saat untuk mengelakkan banjir air pada pasu.
   - Integrasi REST API HTTPS selamat ke Supabase.

---

## 📁 Struktur Direktori Projek

```text
Project Amy/
├── dashboard/                  # Aplikasi Web Dashboard (Vite + React + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx          # Tajuk rasmi POLISAS, clock & status online
│   │   │   ├── StatsOverview.tsx   # 4 kad ringkasan metrik KPI
│   │   │   ├── PotCard.tsx         # Kad interaktif 4 pasu (tolok, butang siram, slider)
│   │   │   ├── MoistureChart.tsx   # Graf sejarah kelembapan 4 pasu
│   │   │   ├── WateringLogTable.tsx# Jadual rekod sejarah siraman
│   │   │   └── SimulatorModal.tsx  # Laci simulator perkakasan untuk demo viva
│   │   ├── lib/
│   │   │   └── supabase.ts         # Konfigurasi Supabase Client & Realtime
│   │   ├── types.ts                # TypeScript Data Models
│   │   ├── App.tsx                 # Komponen Utama Dashboard
│   │   └── index.css               # Tema Glassmorphism & Tailwind v4
│   └── package.json
│
├── database/
│   └── schema.sql              # Skrip SQL Pangkalan Data Supabase (Telah siap dimigrasi)
│
├── esp32/
│   └── smart_irrigation_esp32.ino # Kod C++ Arduino untuk Mikropengawal ESP32
│
├── hardware/
│   └── WIRING_GUIDE.md         # Panduan Lengkap Pendawaian Breadboard & Rajah Skematik
│
└── docs/
    └── superpowers/            # Dokumentasi Spesifikasi & Pelan Pembangunan Lengkap
```

---

## 🚀 Panduan Menjalankan Web Dashboard (Lokal)

1. Buka terminal PowerShell / Command Prompt dan masuk ke direktori `dashboard`:
   ```bash
   cd "C:\Users\Cyborg 15\Desktop\Project Amy\dashboard"
   ```
2. Jalankan arahan pembangunan (development server):
   ```bash
   npm run dev
   ```
3. Buka pelayar web (Google Chrome / Edge) dan layari pautan tempatan yang dipaparkan (biasanya `http://localhost:5173`).
4. Papan pemuka web sedia digunakan dan akan berhubung secara langsung dengan Supabase!

*(Untuk menghasilkan binaan pengeluaran / deployment ke Vercel atau Netlify, jalankan `npm run build` dan muat naik folder `dist/`).*

---

## ⚡ Panduan Memuat Naik Kod ke ESP32 (Arduino IDE)

1. Buka perisian **Arduino IDE**.
2. Pasang sokongan papan ESP32 (jika belum ada):
   - Pergi ke `File` -> `Preferences`.
   - Masukkan pautan berikut pada *Additional Board Manager URLs*:
     ```text
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Pergi ke `Tools` -> `Board` -> `Boards Manager`, cari `esp32` dan klik **Install**.
3. Pasang perpustakaan **ArduinoJson**:
   - Pergi ke `Sketch` -> `Include Library` -> `Manage Libraries...`.
   - Cari `ArduinoJson` (oleh Benoit Blanchon) dan klik **Install** (versi 6.x atau 7.x disokong).
4. Buka fail sketsa:  
   `c:\Users\Cyborg 15\Desktop\Project Amy\esp32\smart_irrigation_esp32.ino`
5. Kemaskini bahagian atas kod:
   ```cpp
   const char* WIFI_SSID     = "NAMA_WIFI_HOTSPOT_ANDA";
   const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";
   ```
6. Sambungkan papan ESP32 ke laptop menggunakan kabel data Micro-USB.
7. Pilih Board: **ESP32 Dev Module** dan pilih Port COM yang sepadan.
8. Klik butang **Upload** (Anak panah ke kanan).
9. Buka **Serial Monitor** pada kadar kelajuan **115200 baud** untuk melihat log pembacaan sensor dan status sambungan WiFi/Supabase!

---

## 🔌 Ringkasan Sambungan Pin Breadboard

| Komponen | Pin Modul | Sambung Ke Pin ESP32 | Catatan |
| :--- | :--- | :--- | :--- |
| **Sensor Pasu 1** | A0 | **GPIO 32** | Pin Analog ADC1 |
| **Sensor Pasu 2** | A0 | **GPIO 33** | Pin Analog ADC1 |
| **Sensor Pasu 3** | A0 | **GPIO 34** | Pin Analog ADC1 |
| **Sensor Pasu 4** | A0 | **GPIO 35** | Pin Analog ADC1 |
| **Relay Pam 1** | IN1 | **GPIO 18** | Active-LOW (`LOW` = ON) |
| **Relay Pam 2** | IN2 | **GPIO 19** | Active-LOW (`LOW` = ON) |
| **Relay Pam 3** | IN3 | **GPIO 21** | Active-LOW (`LOW` = ON) |
| **Relay Pam 4** | IN4 | **GPIO 22** | Active-LOW (`LOW` = ON) |
| **Kuasa Sensor** | VCC & GND | **3V3 & GND ESP32** | Rel Kuasa Atas Breadboard |
| **Kuasa Pam & Relay**| VCC & GND | **Adapter 5V Luaran** | Rel Kuasa Bawah Breadboard |
| **Penyatuan Ground** | GND Atas ↔ GND Bawah | **Wayar Common Ground** | **Wajib disambung!** |

*Rujuk dokumen penuh di [`hardware/WIRING_GUIDE.md`](./hardware/WIRING_GUIDE.md) untuk panduan visual langkah-demi-langkah.*

---

## 🎓 Petua Pembentangan Projek (Viva / FYP Presentation)

Semasa membentangkan projek kepada pensyarah penilai:
1. **Tunjukkan Transformasi Inovasi**: Jelaskan bahawa menggantikan paparan LCD kecil kepada web dashboard membolehkan petani atau pemilik rumah memantau kebun dari mana-mana sahaja di dunia melalui telefon pintar atau komputer riba.
2. **Demonstrasi Kawalan Dua Hala**: Tekan butang *"Siram Sekarang"* pada website untuk menunjukkan bagaimana arahan dihantar serta-merta ke awan Supabase dan diterjemahkan oleh ESP32 untuk menghidupkan pam selama 5 saat.
3. **Gunakan Butang Mod Simulasi Demo**: Jika bekalan air atau tanah fizikal tidak dibawa ke bilik pembentangan, klik butang **"Mod Simulasi Demo"** di sudut atas kanan website untuk meniru keadaan tanah kering (22%) dan tunjukkan bagaimana sistem automatik bertindak balas.
