/*
 * ========================================================================================
 *  PROJEK POLISAS: STESEN CUACA & MIKROKLIMAT TANAMAN PINTAR IoT
 * ========================================================================================
 *  Mikropengawal : ESP32 NodeMCU-32S
 *  Komponen      : 
 *    - Skrin Paparan OLED 0.96" I2C (SSD1306 128x64)
 *    - Sensor Suhu & Kelembapan Udara (DHT11)
 *    - Sensor Kelembapan Tanah Kapasitif (Moisture Sensor v2.0)
 *    - Sensor Kecerahan Cahaya (LDR Module - Pin AO)
 *    - Penggera Audio Aktif (Buzzer)
 *  Pangkalan Data: Supabase PostgreSQL (Cloud Realtime)
 * ========================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ========================================================================================
// 1. KONFIGURASI WIFI & SUPABASE
// ========================================================================================
const char* WIFI_SSID     = "Airy";
const char* WIFI_PASSWORD = "sedakgitu";

const char* SUPABASE_URL  = "https://adqhtjzbzeyiuzvdujnf.supabase.co";
const char* SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcWh0anpiemV5aXV6dmR1am5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNjg4MTAsImV4cCI6MjEwNTc0NDgxMH0.APe7LZp9h9waNWZYYdu-fYt1kvgmFNGCozBYE1nG3bc";

// ========================================================================================
// 2. DEFINISI PIN PERKAKASAN
// ========================================================================================
#define PIN_OLED_SDA  21
#define PIN_OLED_SCL  22
#define PIN_DHT       33  // Data pin modul DHT11
#define PIN_MOISTURE  32  // AOUT Sensor Kelembapan Tanah
#define PIN_LDR       34  // AO (Analog Output) Modul LDR
#define PIN_BUZZER    18  // Pin Penggera Audio

// Konfigurasi Buzzer Aktif (ACTIVE LOW)
// PENTING: Modul Active LOW berbunyi apabila pin diberi isyarat LOW (0V), dan senyap pada HIGH (3.3V/5V)
const int BUZZER_ON  = LOW;   // Active LOW: LOW = Bunyi
const int BUZZER_OFF = HIGH;  // Active LOW: HIGH = Senyap

// Konfigurasi Sensor DHT11
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

// Konfigurasi Skrin OLED
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_I2C_ADDR 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ========================================================================================
// 3. PENENTUKURAN SENSOR (CALIBRATION) & TETAPAN MASA
// ========================================================================================
// Sensor Kelembapan Tanah (Kapasitif)
const int MOISTURE_AIR   = 3500;  // 0% Lembap (Kering di udara)
const int MOISTURE_WATER = 1400;  // 100% Lembap (Dalam air)

// Sensor Cahaya LDR (Guna Pin AO)
const int LDR_DARK_ADC   = 3500;  // Gelap / Waktu Malam
const int LDR_BRIGHT_ADC = 800;   // Terang / Waktu Siang
const int NIGHT_THRESHOLD= 25;    // Kecerahan < 25% = Waktu Malam

// Ambang Penggera Mikroklimat
const float HEAT_THRESHOLD_C = 35.0; // Suhu > 35°C = Amaran Haba Panas Ekstrem
const int   DROUGHT_THRESHOLD= 20;   // Kelembapan Tanah < 20% = Amaran Kemarau

// Tetapan Masa (Milisaat)
const unsigned long SYNC_INTERVAL     = 4000;   // Hantar status ke Supabase setiap 4 saat
const unsigned long POLL_INTERVAL     = 2000;   // Semak arahan manual buzzer setiap 2 saat
const unsigned long LOG_SAVE_INTERVAL = 60000;  // Simpan ke weather_station_logs setiap 1 minit
const unsigned long OLED_REFRESH_MS   = 500;    // Kemaskini paparan OLED setiap 0.5 saat

// ========================================================================================
// 4. STRUKTUR DATA STESEN MIKROKLIMAT
// ========================================================================================
struct StationData {
  float temperatureC;
  int   airHumidityPct;
  bool  dhtConnected;

  int   moisturePct;
  int   rawMoistureAdc;
  bool  sensorConnected;

  int   lightPct;
  int   rawLdrAdc;
  bool  isNight;

  bool  buzzerActive;
  bool  buzzerEnabled;
  String buzzerReason;
};

StationData station = {
  28.5, 65, true,
  50, 2400, true,
  70, 1500, false,
  false, true, "STANDBY"
};

// Pemasa Kitaran
unsigned long lastSyncTime    = 0;
unsigned long lastPollTime    = 0;
unsigned long lastLogSaveTime = 0;
unsigned long lastOledTime    = 0;

// Kawalan Pemasaan Buzzer Non-Blocking
unsigned long buzzerStartTime = 0;
unsigned long buzzerDuration  = 0;
bool manualBuzzerTest         = false;

// ========================================================================================
// 5. DEKLARASI FUNGSI (FORWARD DECLARATIONS)
// ========================================================================================
void connectToWiFi();
void readAllSensors();
void updateBuzzerLogic(unsigned long currentMillis);
void updateOledDisplay();
void syncStatusToCloud();
void pollPendingCommands();
void saveHistoryLog();
void updateCommandStatus(long cmdId, const String& status);

// ========================================================================================
// 6. SETUP PERMULAAN
// ========================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("  POLISAS: STESEN MIKROKLIMAT & TANAMAN PINTAR IoT      ");
  Serial.println("========================================================");

  // Konfigurasi Pin Perkakasan
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, BUZZER_OFF); // Pastikan buzzer senyap sewaktu but (Active LOW)

  pinMode(PIN_MOISTURE, INPUT);
  pinMode(PIN_LDR, INPUT);

  // Inisialisasi Sensor DHT11
  dht.begin();
  Serial.println("[DHT11] Sensor Suhu & Kelembapan Udara dimulakan.");

  // Inisialisasi I2C & Skrin OLED
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_I2C_ADDR)) {
    Serial.println("[OLED ERROR] Gagal mengesan skrin SSD1306! Periksa wayar SDA (21) & SCL (22).");
  } else {
    Serial.println("[OLED] Skrin OLED berjaya dikesan!");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 15);
    display.println("POLISAS AGRO IoT");
    display.setCursor(10, 30);
    display.println("Stesen Mikroklimat");
    display.setCursor(10, 45);
    display.println("Memulakan WiFi...");
    display.display();
  }

  // Sambungkan ke WiFi
  connectToWiFi();

  // Kemas kini paparan awal
  updateOledDisplay();
  Serial.println("[SISTEM] Stesen sedia beroperasi!");
}

// ========================================================================================
// 7. GELUNG UTAMA (MAIN LOOP)
// ========================================================================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Bacaan berterusan semua sensor
  readAllSensors();

  // 2. Logik Penggera Buzzer Pintar
  updateBuzzerLogic(currentMillis);

  // 3. Kemas kini paparan skrin OLED
  if (currentMillis - lastOledTime >= OLED_REFRESH_MS) {
    lastOledTime = currentMillis;
    updateOledDisplay();
  }

  // 4. Semak arahan manual web (Uji Buzzer / Mute) setiap 2 saat
  if (currentMillis - lastPollTime >= POLL_INTERVAL) {
    lastPollTime = currentMillis;
    pollPendingCommands();
  }

  // 5. Hantar telemetri terkini ke Supabase setiap 4 saat
  if (currentMillis - lastSyncTime >= SYNC_INTERVAL) {
    lastSyncTime = currentMillis;
    syncStatusToCloud();
  }

  // 6. Simpan rekod sejarah ke weather_station_logs setiap 1 minit
  if (currentMillis - lastLogSaveTime >= LOG_SAVE_INTERVAL) {
    lastLogSaveTime = currentMillis;
    saveHistoryLog();
  }

  delay(20);
}

// ========================================================================================
// 8. PEMBACAAN SENSOR & PENAPISAN HINGAR
// ========================================================================================
void readAllSensors() {
  // A. Pembacaan Sensor DHT11 (Suhu & Kelembapan Udara)
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    station.dhtConnected = false;
  } else {
    station.dhtConnected   = true;
    station.temperatureC   = temp;
    station.airHumidityPct = (int)hum;
  }

  // B. Pembacaan Sensor Kelembapan Tanah (Kapasitif) dengan 8-sample smoothing
  const int SAMPLES = 8;
  long sumMoisture = 0, sumLdr = 0;

  for (int i = 0; i < SAMPLES; i++) {
    sumMoisture += analogRead(PIN_MOISTURE);
    sumLdr      += analogRead(PIN_LDR);
    delay(2);
  }

  int avgMoisture = sumMoisture / SAMPLES;
  int avgLdr      = sumLdr / SAMPLES;

  station.rawMoistureAdc = avgMoisture;
  station.rawLdrAdc      = avgLdr;

  // Semakan sempadan selamat wayar sensor kelembapan tanah
  if (avgMoisture < 350 || avgMoisture > 4050) {
    station.sensorConnected = false;
    station.moisturePct     = 0;
  } else {
    station.sensorConnected = true;
    int mPct = map(avgMoisture, MOISTURE_AIR, MOISTURE_WATER, 0, 100);
    station.moisturePct = constrain(mPct, 0, 100);
  }

  // C. Penilaian Sensor Cahaya LDR (Pin AO)
  int lPct = map(avgLdr, LDR_DARK_ADC, LDR_BRIGHT_ADC, 0, 100);
  station.lightPct = constrain(lPct, 0, 100);
  station.isNight  = (station.lightPct < NIGHT_THRESHOLD);
}

// ========================================================================================
// 9. LOGIK PENGGERA AUDIO (BUZZER - ACTIVE LOW)
// ========================================================================================
void updateBuzzerLogic(unsigned long currentMillis) {
  // A. Ujian Manual dari Web (Priority Tertinggi)
  if (manualBuzzerTest) {
    if (currentMillis - buzzerStartTime < buzzerDuration) {
      digitalWrite(PIN_BUZZER, BUZZER_ON);
      station.buzzerActive = true;
      station.buzzerReason = "UJIAN MANUAL WEB";
      return;
    } else {
      digitalWrite(PIN_BUZZER, BUZZER_OFF);
      manualBuzzerTest     = false;
      station.buzzerActive = false;
      station.buzzerReason = "STANDBY";
    }
  }

  // B. Semak sama ada Buzzer di-Mute dari Web
  if (!station.buzzerEnabled) {
    digitalWrite(PIN_BUZZER, BUZZER_OFF);
    station.buzzerActive = false;
    station.buzzerReason = "DISENYAPKAN (MUTED)";
    return;
  }

  // C. Penggera Haba Panas Ekstrem (Suhu Udara > 35°C)
  if (station.dhtConnected && station.temperatureC >= HEAT_THRESHOLD_C) {
    station.buzzerReason = "AMARAN SUHU PANAS EKSTREM!";
    // Corak bip pantas berselang
    int cycle = (currentMillis / 150) % 4;
    if (cycle == 0) {
      digitalWrite(PIN_BUZZER, BUZZER_ON);
      station.buzzerActive = true;
    } else {
      digitalWrite(PIN_BUZZER, BUZZER_OFF);
      station.buzzerActive = false;
    }
    return;
  }

  // D. Penggera Tanah Terlalu Kering (Kelembapan Tanah < 20%)
  if (station.sensorConnected && station.moisturePct < DROUGHT_THRESHOLD) {
    station.buzzerReason = "TANAH KRITIKAL KERING";
    // Corak bip amaran: Bip 150ms setiap 3 saat
    if ((currentMillis % 3000) < 150) {
      digitalWrite(PIN_BUZZER, BUZZER_ON);
      station.buzzerActive = true;
    } else {
      digitalWrite(PIN_BUZZER, BUZZER_OFF);
      station.buzzerActive = false;
    }
    return;
  }

  // E. Keadaan Biasa (Standby / Aman)
  digitalWrite(PIN_BUZZER, BUZZER_OFF);
  station.buzzerActive = false;
  station.buzzerReason = "STANDBY";
}

// ========================================================================================
// 10. PAPARAN SKRIN OLED (128x64)
// ========================================================================================
void updateOledDisplay() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Baris Header: Nama Sistem & Status WiFi
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("POLISAS AGRO");
  display.setCursor(80, 0);
  if (WiFi.status() == WL_CONNECTED) {
    display.print("[WiFi OK]");
  } else {
    display.print("[NO WiFi]");
  }

  // Garisan Pemisah Header
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Baris 1: Suhu & Kelembapan Udara (DHT11)
  display.setCursor(0, 14);
  display.print("Suhu  : ");
  if (!station.dhtConnected) {
    display.print("--.-C [ERROR]");
  } else {
    display.print(station.temperatureC, 1);
    display.print("C (");
    display.print(station.airHumidityPct);
    display.print("%)");
  }

  // Baris 2: Kelembapan Tanah
  display.setCursor(0, 26);
  display.print("Tanah : ");
  if (!station.sensorConnected) {
    display.print("--% [TERPUTUS]");
  } else {
    display.print(station.moisturePct);
    display.print("% [");
    if (station.moisturePct >= 60)      display.print("LEMBAP");
    else if (station.moisturePct >= 30) display.print("SEDERHANA");
    else                                display.print("KERING");
    display.print("]");
  }

  // Baris 3: Cahaya LDR
  display.setCursor(0, 38);
  display.print("Cahaya: ");
  if (station.isNight) {
    display.print("MALAM (");
  } else {
    display.print("SIANG (");
  }
  display.print(station.lightPct);
  display.print("%)");

  // Garisan Pemisah Bawah
  display.drawLine(0, 50, 127, 50, SSD1306_WHITE);

  // Baris 4: Status Buzzer & Sistem
  display.setCursor(0, 54);
  display.print("Penggera: ");
  if (!station.buzzerEnabled) {
    display.print("[MUTED]");
  } else if (station.buzzerActive) {
    display.print("BUNYI!");
  } else {
    display.print("STANDBY");
  }

  display.display();
}

// ========================================================================================
// 11. PENGURUSAN RANGKAIAN WIFI
// ========================================================================================
void connectToWiFi() {
  Serial.printf("[WIFI] Menyambung ke rangkaian '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] BERJAYA DISAMBUNG!");
    Serial.printf("[WIFI] Alamat IP ESP32: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI AMARAN] Sambungan WiFi belum sedia. Terus beroperasi offline.");
  }
}

// ========================================================================================
// 12. KOMUNIKASI SUPABASE CLOUD (REST API)
// ========================================================================================
void syncStatusToCloud() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(SUPABASE_URL) + "/rest/v1/weather_station_status?id=eq.1";
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["temperature_c"]    = station.temperatureC;
  doc["air_humidity_pct"] = station.airHumidityPct;
  doc["heat_alert"]       = (station.temperatureC >= HEAT_THRESHOLD_C);
  doc["moisture_pct"]     = station.moisturePct;
  doc["raw_moisture_adc"] = station.rawMoistureAdc;
  doc["light_pct"]        = station.lightPct;
  doc["raw_ldr_adc"]      = station.rawLdrAdc;
  doc["is_night"]         = station.isNight;
  doc["buzzer_active"]    = station.buzzerActive;
  doc["buzzer_reason"]    = station.buzzerReason;
  doc["sensor_connected"] = station.sensorConnected;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.PATCH(requestBody);
  if (httpCode <= 0 && httpCode != 200 && httpCode != 204) {
    Serial.printf("[SUPABASE PATCH ERROR] Status HTTP: %d\n", httpCode);
  }
  http.end();
}

void pollPendingCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  // Dapatkan arahan PENDING paling awal
  String endpoint = String(SUPABASE_URL) + "/rest/v1/weather_station_commands?status=eq.PENDING&order=id.asc&limit=1";
  http.begin(client, endpoint);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    JsonDocument doc;
    deserializeJson(doc, payload);
    JsonArray array = doc.as<JsonArray>();

    if (array.size() > 0) {
      JsonObject cmd = array[0];
      long cmdId    = cmd["id"];
      String action = cmd["action"].as<String>();

      Serial.printf("[WEB COMMAND] ID: %ld | Tindakan: %s\n", cmdId, action.c_str());

      if (action == "TEST_BUZZER_2S") {
        manualBuzzerTest = true;
        buzzerStartTime  = millis();
        buzzerDuration   = 2000; // 2 saat
        digitalWrite(PIN_BUZZER, BUZZER_ON);
      } else if (action == "MUTE") {
        station.buzzerEnabled = false;
        digitalWrite(PIN_BUZZER, BUZZER_OFF);
      } else if (action == "UNMUTE") {
        station.buzzerEnabled = true;
      }

      updateCommandStatus(cmdId, "COMPLETED");
    }
  }
  http.end();

  // Muat turun tetapan buzzer_enabled terkini jika diubah di web
  String settingsUrl = String(SUPABASE_URL) + "/rest/v1/weather_station_status?id=eq.1&select=buzzer_enabled";
  http.begin(client, settingsUrl);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  int code = http.GET();
  if (code == 200) {
    String p = http.getString();
    JsonDocument sDoc;
    deserializeJson(sDoc, p);
    JsonArray arr = sDoc.as<JsonArray>();
    if (arr.size() > 0) {
      station.buzzerEnabled = arr[0]["buzzer_enabled"] | true;
    }
  }
  http.end();
}

void updateCommandStatus(long cmdId, const String& status) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(SUPABASE_URL) + "/rest/v1/weather_station_commands?id=eq." + String(cmdId);
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["status"]      = status;
  doc["executed_at"] = "now()";

  String requestBody;
  serializeJson(doc, requestBody);
  http.PATCH(requestBody);
  http.end();
}

void saveHistoryLog() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(SUPABASE_URL) + "/rest/v1/weather_station_logs";
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["temperature_c"]    = station.temperatureC;
  doc["air_humidity_pct"] = station.airHumidityPct;
  doc["moisture_pct"]     = station.moisturePct;
  doc["light_pct"]        = station.lightPct;
  doc["is_night"]         = station.isNight;
  doc["buzzer_state"]     = station.buzzerActive;

  String requestBody;
  serializeJson(doc, requestBody);
  http.POST(requestBody);
  http.end();
}
