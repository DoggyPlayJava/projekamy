# Design Specification: Floating Glass Navigation Tabs (UI/UX Transformation)

**Project:** Sistem Pengairan Pintar (Smart Irrigation System)  
**Institution:** Politeknik Sultan Haji Ahmad Shah (POLISAS) — Jabatan Kejuruteraan Mekanikal  
**Date:** 2026-09-24  
**Status:** Approved by User (Option 1 Selected)  

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
Sebelum ini, semua modul sistem—termasuk Header, Status ESP32, 5 Kad Statistik KPI, Ramalan Cuaca Open-Meteo, Kalkulator Penjimatan ROI, 4 Pasu Tanaman (radial gauge + slider), Pengurus Jadual Siraman, Graf Sejarah Kelembapan, dan Jadual Log Siraman—dihimpunkan dalam **satu halaman menegak yang panjang (*single crowded scroll*)**.

Keadaan ini menimbulkan:
1. **Beban Kognitif (*Cognitive Overload*)**: Terlalu banyak maklumat bersaing untuk perhatian pengguna pada satu-satu masa.
2. **Ketiadaan Ruang Bernafas (*Negative Space*)**: Reka bentuk kelihatan padat dan menyerupai panel kawalan kilang konvensional berbanding aplikasi web pertanian moden bertaraf industri.
3. **Kelemahan Aliran Pembentangan Viva**: Pelajar terpaksa menatal skrin (*scroll*) ke atas dan ke bawah berulang kali untuk mencari bahagian tertentu semasa dinilai oleh panel penilai.

### 1.2 The Solution: Floating Glass Navigation Tabs (Pilihan 1)
Mengasingkan papan pemuka kepada **4 paparan fokus bebas (*dedicated modular views*)** yang dihubungkan melalui **Bar Tab Kaca Terapung (*Floating Glass Tab Bar*)** bertema *Modern Glassmorphism Agro*:

```
+---------------------------------------------------------------------------------+
|                       HEADER (Branding, Live Status, Jam, Notifikasi)            |
+---------------------------------------------------------------------------------+
|               [OFFLINE BANNER] (Hanya muncul jika ESP32 terputus >60s)          |
+---------------------------------------------------------------------------------+
|  [ 🌿 Pasu & Pemantauan ]  [ ⛅ Cuaca & Kos ]  [ ⏰ Jadual ]  [ 📊 Log & Analitik ] |
+---------------------------------------------------------------------------------+
|                                                                                 |
|                      KANDUNGAN TAB AKTIF (LAPANG & FOKUS)                       |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

---

## 2. Seni Bina Tab & Pembahagian Modul

### Tab 1: 🌿 Pasu & Pemantauan (`garden` - Default View)
* **Fokus**: Pemantauan langsung status tanaman harian petani/pengguna.
* **Komponen Terlibat**:
  * `StatsOverview.tsx` (5 Kad Metrik KPI: Purata Kelembapan, Pam Beroperasi, Kitaran Hari Ini, Penggunaan Air Hari Ini, Status Tangki).
  * 4x `PotCard.tsx` (Tolok Bulatan Animasi, Pilihan Pratetap Sayuran 1-Klik, Pelarasan Ambang Siraman, dan Butang Siram Manual 5 Saat).
* **Kelebihan**: Halaman utama kini **sangat bersih, lapang, dan menenangkan**. Masuk ke web terus nampak pokok dan air tanpa serabut!

### Tab 2: ⛅ Kecerdasan Cuaca & Kos (`weather-roi`)
* **Fokus**: Justifikasi komersial, kecekapan sumber dan inovasi cuaca untuk Bab 4 & Bab 5 Laporan FYP.
* **Komponen Terlibat**:
  * `WeatherWidget.tsx` (Ramalan Open-Meteo Kuantan, Suhu, Kelembapan, Kelajuan Angin, Bar Hujan 4 Jam, Logik Penangguhan Siraman Automatik, dan Butang Ujian Simulasi Viva).
  * `CostSavingWidget.tsx` (Kiraan Penjimatan RM 27.92/bulan, Air 612 Liter, Masa 7.5 Jam, dan Modal Pop-Up Formula Matematik).
* **Kelebihan**: Panel penilai yang ingin melihat aspek komersial dan kecerdasan algoritma boleh terus membuka tab ini yang khusus mempersembahkan impak ekonomi projek.

### Tab 3: ⏰ Jadual Siraman Pintar (`schedules`)
* **Fokus**: Automasi pengairan berkala dan logik penjimatan pintar.
* **Komponen Terlibat**:
  * `ScheduleManager.tsx` (Borang penambahan waktu siraman, suis aktif/nyahaktif, senarai jadual, butang laksana serta-merta, dan penapis *Smart Skip* jika tanah telah lembap).
* **Kelebihan**: Mengasingkan tetapan automasi daripada paparan pemantauan supaya pengguna tidak tersilap menukar konfigurasi.

### Tab 4: 📊 Log & Analitik Data (`analytics`)
* **Fokus**: Pembuktian empirikal data kajian untuk Bab 4 Analisis Dapatan tesis diploma.
* **Komponen Terlibat**:
  * `MoistureChart.tsx` (Graf siri masa kelembapan 4 pasu interaktif dengan garis ambang).
  * `WateringLogTable.tsx` (Senarai rekod siraman automatik/manual berserta butang 1-Klik **"Eksport CSV / Excel"**).
* **Kelebihan**: Menyediakan ruang penuh untuk graf dan jadual lebar tanpa perlu dihimpit oleh kad-kad lain.

---

## 3. Spesifikasi Komponen & Interaksi Antara Muka

### 3.1 Komponen Bar Tab: `NavigationTabs.tsx`
* **Reka Bentuk Visual**:
  * Menggunakan *glassmorphism backdrop* dengan sempadan putih kabur (`backdrop-blur-md bg-white/75 border border-white/80 shadow-sm rounded-2xl p-1.5`).
  * Tab aktif mempunyai lencana latar hijau zamrud dengan teks putih/zamrud pekat (`bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold`).
  * Tab tidak aktif mempunyai gaya teks kelabu lembut dengan kesan sentuhan mikro (`text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all font-semibold`).
* **Lencana Kiraan Dinamik (*Dynamic Badges*)**:
  * Tab 1: Lencana `4 Pasu`
  * Tab 2: Lencana `Kuantan`
  * Tab 3: Lencana `{N} Aktif` (bilangan jadual yang aktif)
  * Tab 4: Lencana `{N} Rekod` (bilangan log siraman)
* **Penyimpanan Keadaan (*State Persistence*)**:
  * Tab yang aktif disimpan dalam `localStorage` (`smart_irrigation_active_tab`), supaya apabila pengguna me-refresh halaman, mereka kekal berada pada tab yang sedang dilihat.

---

## 4. Pelan Pelaksanaan & Struktur Fail

1. **Komponen Baharu**:
   * `dashboard/src/components/NavigationTabs.tsx` — Bar tab terapung kaca estetik dengan lencana dinamik dan kesan sentuhan responsif.
2. **Pengubahsuaian `App.tsx`**:
   * Menambah keadaan `activeTab` ('garden' | 'weather-roi' | 'schedules' | 'analytics').
   * Membungkus modul-modul sedia ada ke dalam blok bersyarat berdasarkan `activeTab` dengan animasi peralihan `animate-fade-in`.
3. **Ujian & Pengesahan**:
   * Binaan `npm run build` untuk integriti kod TypeScript.
   * Ujian pertukaran tab secara langsung dalam pelayar web DevTools bagi mengesahkan kelapangan (*spaciousness*) dan ketiadaan ralat susun atur.
