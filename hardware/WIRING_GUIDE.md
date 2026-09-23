# Panduan Lengkap Pemasangan Breadboard & Pendawaian Perkakasan
## Projek Sistem Pengairan Pintar (Smart Irrigation System)
**Jabatan Kejuruteraan Mekanikal — Politeknik Sultan Haji Ahmad Shah (POLISAS)**

Dokumen ini disediakan khusus untuk membantu anda menyambung semua komponen projek (**ESP32 30-pin, 4 sensor kelembapan tanah, modul 4-channel relay, 4 pam air mini 5V, dan punca kuasa**) pada **Breadboard Besar Panjang (MB-102 830-tie points)** tanpa menggunakan sebarang *pin extender / expansion board*.

---

## 1. Memahami Masalah Breadboard & Solusi Fizikal

### Masalah Biasa ESP32 pada Breadboard:
- Papan pembangunan ESP32 30-pin mempunyai kelebaran jarak kaki **0.9 inci** (9 selang lubang).
- Breadboard biasa MB-102 mempunyai 5 lubang di sebelah kiri (Lajur **A, B, C, D, E**), parit pemisah tengah (*center trench*), dan 5 lubang di sebelah kanan (Lajur **F, G, H, I, J**).
- Apabila kaki kiri ESP32 dicucuk pada **Lajur E**, kaki kanan ESP32 akan jatuh tepat pada **Lajur J** (lajur paling tepi). Ini menyebabkan **Lajur A, B, C, D di sebelah kiri masih mempunyai 4 lubang kosong** (senang cucuk wayar), manakala **di sebelah kanan tiada langsung lubang kosong berbaki**!

### Solusi Praktikal (Pilih salah satu yang paling mudah bagi anda):

#### Kaedah A: Wayar Jumper Female-to-Male (Paling Disyorkan & Sangat Kemas)
1. Bagi kaki di **sebelah kanan ESP32** (di mana terletaknya pin GPIO 18, 19, 21, 22 untuk relay):
   - Cucukkan kepala **Female** wayar jumper DuPont terus ke pin header kaki ESP32 berkenaan.
   - Hujung kepala **Male** wayar itu pula disambungkan terus ke soket input modul Relay (`IN1`, `IN2`, `IN3`, `IN4`).
2. Kaki di **sebelah kiri ESP32** dicucuk seperti biasa ke breadboard (Lajur E). Anda mempunyai 4 baris lubang kosong (A, B, C, D) untuk mencucuk pin 3.3V, GND, dan 4 pin analog sensor (GPIO 32, 33, 34, 35).

#### Kaedah B: Gabungkan 2 Breadboard (Jika Ada 2 Breadboard)
- Breadboard MB-102 mempunyai klip penyambung di bahagian sisinya. Anda boleh menanggalkan rel kuasa tengah dan menyambungkan 2 breadboard menjadi satu platform yang luas. ESP32 boleh dicucuk di tengah-tengah dengan selesa.

---

## 2. Prinsip Penting: Dwi-Punca Kuasa (*Dual Power Supply*) & Common Ground

> [!CAUTION]
> **JANGAN SESEKALI membekalkan kuasa kepada 4 pam air terus daripada pin 3V3 atau pin 5V (Vin) ESP32!**  
> Pam air mengandungi motor DC yang menarik arus elektrik yang tinggi (150mA–300mA setiap satu semasa berputar). Menghidupkan pam daripada ESP32 akan menyebabkan voltan jatuh (*brownout*), ESP32 terpadam (*restart* berulang kali), atau merosakkan cip mikropengawal.

### Susunan Rel Kuasa pada Breadboard:
1. **Rel Kuasa Atas (3.3V Sensor & Logik ESP32)**:
   - Sambungkan pin **`3V3`** dari ESP32 ke baris **Positif (+) Rel Atas**.
   - Sambungkan pin **`GND`** dari ESP32 ke baris **Negatif (-) Rel Atas**.
   - Digunakan untuk membekalkan 3.3V yang bersih kepada 4 Sensor Kelembapan Tanah.
2. **Rel Kuasa Bawah (5V Kuasa Pam Air & Relay)**:
   - Sambungkan kabel bekalan 5V luaran (daripada Adapter telefon 5V 2A atau Power Bank) ke baris **Positif (+) Rel Bawah**.
   - Sambungkan wayar Negatif (0V) daripada bekalan 5V luaran ke baris **Negatif (-) Rel Bawah**.
   - Digunakan untuk menggerakkan gegelung relay dan motor 4 pam air.
3. **Penyatuan Ground (COMMON GROUND — WAJIB)**:
   - Pasangkan satu wayar jumper di antara baris **Negatif (-) Rel Atas** dan baris **Negatif (-) Rel Bawah**.
   - Ini memastikan isyarat kawalan dari ESP32 ke modul relay mempunyai aras rujukan voltan yang sama.

---

## 3. Jadual Sambungan Pin Lengkap

### A. Sambungan 4 Sensor Kelembapan Tanah (Analog)
*Nota: Kita wajib menggunakan pin ADC1 (GPIO 32–35) kerana fungsi WiFi ESP32 tidak mengganggu pin ini.*

| Sensor | Pin Sensor | Sambung Ke (Breadboard / ESP32) |
| :--- | :--- | :--- |
| **Semua Sensor (1 hingga 4)** | **VCC** | Rel Positif Atas (**3.3V**) |
| **Semua Sensor (1 hingga 4)** | **GND** | Rel Negatif Atas (**GND**) |
| **Sensor Pasu 1** | **A0 (Analog Out)** | **GPIO 32** (ESP32) |
| **Sensor Pasu 2** | **A0 (Analog Out)** | **GPIO 33** (ESP32) |
| **Sensor Pasu 3** | **A0 (Analog Out)** | **GPIO 34** (ESP32) |
| **Sensor Pasu 4** | **A0 (Analog Out)** | **GPIO 35** (ESP32) |

*(Pin D0 pada modul sensor tidak digunakan — biarkan kosong).*

---

### B. Sambungan Modul 4-Channel Relay
*Modul relay bertindak sebagai suis elektronik selamat.*

| Pin Modul Relay | Sambung Ke | Fungsi |
| :--- | :--- | :--- |
| **VCC** | Rel Positif Bawah (**5V External**) | Kuasa untuk gegelung suis relay |
| **GND** | Rel Negatif Bawah (**Common GND**) | Ground pembumian |
| **IN1** | **GPIO 18** (ESP32) | Isyarat kawalan Pam Pasu 1 |
| **IN2** | **GPIO 19** (ESP32) | Isyarat kawalan Pam Pasu 2 |
| **IN3** | **GPIO 21** (ESP32) | Isyarat kawalan Pam Pasu 3 |
| **IN4** | **GPIO 22** (ESP32) | Isyarat kawalan Pam Pasu 4 |

---

### C. Sambungan 4 Pam Air Mini 5V ke Terminal Skru Relay
Setiap saluran relay mempunyai 3 blok terminal skru: **COM (Common)**, **NO (Normally Open)**, dan **NC (Normally Closed)**. Kita menggunakan sambungan **COM dan NO**.

Untuk setiap pam (Pam 1 hingga Pam 4):
1. **Wayar Hitam Pam (-) (Ground)**: Sambungkan terus ke baris **Negatif (-) Rel Bawah**.
2. **Wayar Merah Pam (+) (Positif)**: Sambungkan ke terminal **NO (Normally Open)** pada saluran relay masing-masing.
3. **Terminal COM (Common)** pada setiap relay: Sambungkan ke baris **Positif (+) Rel Bawah (5V External)**.

*Aliran litar:* Apabila ESP32 memberi isyarat `LOW` kepada relay, suis NO akan tertutup dan melengkapkan litar 5V untuk menghidupkan pam air selama 5 saat.

---

## 4. Rajah Skematik Visual (ASCII Breadboard Map)

```
========================================================================================
                      BREADBOARD MB-102 (PANDANGAN ATAS)
========================================================================================
[REL ATAS (+)]:  3.3V  <────── Dari Pin 3V3 ESP32 ──────> Kuasa VCC 4 Sensor Tanah
[REL ATAS (-)]:  GND   <────── Dari Pin GND ESP32 ──────> Ground GND 4 Sensor Tanah
                   │
                   │ [WAYAR COMMON GROUND: Sambung Rel (-) Atas ke Rel (-) Bawah]
                   ▼
[REL BAWAH (-)]: GND Luaran ◄── Wayar Hitam Adapter 5V + Wayar Hitam 4 Pam Air + Relay GND
[REL BAWAH (+)]: +5V Luaran ◄── Wayar Merah Adapter 5V + Terminal COM Relay 1, 2, 3, 4
========================================================================================

                 [ BREADBOARD PIN ROWS ]
Lajur:    A   B   C   D   E    | Parit Tengah |    F   G   H   I   J
Row 1:   [ ] [ ] [ ] [ ] [3V3] |======|======| [Vin] [ ] [ ] [ ] [ ]
Row 2:   [ ] [ ] [ ] [ ] [GND] |======|======| [GND] [ ] [ ] [ ] [ ]
Row 3:   [ ] [ ] [ ] [ ] [D15] |======|======| [D13] [ ] [ ] [ ] [ ]
Row 4:   [ ] [ ] [ ] [ ] [D2 ] |======|======| [D12] [ ] [ ] [ ] [ ]
Row 5:   [ ] [ ] [ ] [ ] [D4 ] |======|======| [D14] [ ] [ ] [ ] [ ]
Row 6:   [ ] [ ] [ ] [ ] [RX2] |======|======| [D27] [ ] [ ] [ ] [ ]
Row 7:   [ ] [ ] [ ] [ ] [TX2] |======|======| [D26] [ ] [ ] [ ] [ ]
Row 8:   [ ] [ ] [ ] [ ] [D5 ] |======|======| [D25] [ ] [ ] [ ] [ ]
Row 9:   [•]─[•]─[•]─[•]─[D18] |======|======| [D33]──> Ke Sensor 2 (A0)
          │   (Wayar ke IN1 Relay)
Row 10:  [•]─[•]─[•]─[•]─[D19] |======|======| [D32]──> Ke Sensor 1 (A0)
          │   (Wayar ke IN2 Relay)
Row 11:  [•]─[•]─[•]─[•]─[D21] |======|======| [D35]──> Ke Sensor 4 (A0)
          │   (Wayar ke IN3 Relay)
Row 12:  [•]─[•]─[•]─[•]─[D22] |======|======| [D34]──> Ke Sensor 3 (A0)
          │   (Wayar ke IN4 Relay)
Row 13:  [ ] [ ] [ ] [ ] [D23] |======|======| [VN ] [ ] [ ] [ ] [ ]
Row 14:  [ ] [ ] [ ] [ ] [EN ] |======|======| [VP ] [ ] [ ] [ ] [ ]
```

---

## 5. Senarai Semak Ujian Sebelum Dihidupkan (Pre-Power Checklist)

Sebelum memasang kabel USB atau adapter elektrik, semak 5 perkara berikut:
1. [ ] **Tiada Litar Pintas**: Pastikan tiada wayar dari rel (+) bersentuhan terus dengan rel (-).
2. [ ] **Common Ground Dipasang**: Sahkan wayar penyambung antara GND Atas dan GND Bawah dipasang dengan kukuh.
3. [ ] **Orientasi Sensor**: Pastikan kabel VCC sensor dipasang pada 3.3V (bukan 5V, untuk melindungi pin ADC ESP32).
4. [ ] **Terminal Pam**: Sahkan wayar merah pam masuk ke NO, bukan NC (supaya pam tidak menyiram secara tidak sengaja sewaktu sistem dimulakan).
5. [ ] **Paras Tiub Air**: Pastikan tiub air dari pam dimasukkan ke pasu tanaman dan tidak tercabut.

---

## 6. Ujian Penentukuran Sensor Tanah (Sensor Calibration)

Nilai mentah analog ESP32 adalah antara `0` hingga `4095`:
- **Di Udara Kering (Dry Air)**: Bacaan biasanya sekitar `3200 – 3800`.
- **Di Dalam Cawan Air / Tanah Lembap (Saturated Wet Soil)**: Bacaan biasanya sekitar `1300 – 1700`.

Dalam kod ESP32 nanti, terdapat pembolehubah:
```cpp
const int AIR_VALUE = 3500;    // Nilai analog bila sensor kering di udara
const int WATER_VALUE = 1500;  // Nilai analog bila probe sensor terendam dalam air
```
Anda boleh menguji bacaan mentah ini menggunakan Serial Monitor pada kelajuan **115200 baud** untuk mendapatkan penentukuran yang paling jitu bagi jenis tanah pasu anda!
