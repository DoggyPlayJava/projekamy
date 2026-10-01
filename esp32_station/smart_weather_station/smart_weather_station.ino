/*
 * ========================================================================================
 *  PROJEK POLISAS: STESEN CUACA & TANAMAN PINTAR IoT (SMART WEATHER & AGRO ALERT STATION)
 * ========================================================================================
 *  Mikropengawal : ESP32 NodeMCU-32S
 *  Komponen      : 
 *    - Skrin Paparan OLED 0.96" I2C (SSD1306 128x64)
 *    - Sensor Kelembapan Tanah Kapasitif (Moisture Sensor v2.0)
 *    - Sensor Titisan Hujan (Raindrop Sensor)
 *    - Sensor Kecerahan Cahaya (LDR Module)
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
#define PIN_MOISTURE  32
#define PIN_RAIN      33
#define PIN_LDR       34
#define PIN_BUZZER    18

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
const int MOISTURE_AIR   = 3500;  // 0% Lembap (Kering)
const int MOISTURE_WATER = 1400;  // 100% Lembap (Air)

// Sensor Hujan
const int RAIN_DRY_ADC   = 3800;  // Kering
const int RAIN_WET_ADC   = 1200;  // Basah / Hujan Lebat
const int RAIN_THRESHOLD = 3200;  // Bawah nilai ini = Hujan Dikesan

// Sensor Cahaya LDR
const int LDR_DARK_ADC   = 3500;  // Gelap / Malam
const int LDR_BRIGHT_ADC = 800;   // Terang / Siang
const int NIGHT_THRESHOLD= 25;    // Kurang 25% = Waktu Malam

// Tetapan Masa (Milisaat)
const unsigned long SYNC_INTERVAL     = 4000;   // Hantar status ke Supabase setiap 4 saat
const unsigned long POLL_INTERVAL     = 2000;   // Semak arahan manual buzzer setiap 2 saat
const unsigned long LOG_SAVE_INTERVAL = 60000;  // Simpan ke weather_station_logs setiap 1 minit
const unsigned long OLED_REFRESH_MS   = 500;    // Kemaskini paparan OLED setiap 0.5 saat

// ========================================================================================
// 4. STRUKTUR DATA STESEN CUACA
// ========================================================================================
struct StationData {
  int  moisturePct;
  int  rawMoistureAdc;
  bool sensorConnected;

  bool rainDetected;
  int  rainIntensityPct;
  int  rawRainAdc;

  int  lightPct;
  int  rawLdrAdc;
  bool isNight;

  bool buzzerActive;
  bool buzzerEnabled;
  String buzzerReason;
};

StationData station = {
  50, 2400, true,
  false, 0, 3800,
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
  Serial.println("  POLISAS: STESEN CUACA & TANAMAN PINTAR IoT MEMULAKAN  ");
  Serial.println("========================================================");

  // Konfigurasi Pin Perkakasan
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW); // Pastikan buzzer senyap sewaktu but

  pinMode(PIN_MOISTURE, INPUT);
  pinMode(PIN_RAIN, INPUT);
  pinMode(PIN_LDR, INPUT);

  // Inisialisasi I2C & Skrin OLED
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_I2C_ADDR)) {
    Serial.println("[OLED ERROR] Gagal mengesan skrin SSD1306! Periksa sambungan I2C.");
  } else {
    Serial.println("[OLED] Skrin berjaya dikesan!");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 15);
    display.println("POLISAS AGRO IoT");
    display.setCursor(10, 30);
    display.println("Stesen Cuaca Pintar");
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

  // 1. Bacaan berterusan semua sensor (dengan penapisan purata)
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
  const int SAMPLES = 8;
  long sumMoisture = 0, sumRain = 0, sumLdr = 0;

  for (int i = 0; i < SAMPLES; i++) {
    sumMoisture += analogRead(PIN_MOISTURE);
    sumRain     += analogRead(PIN_RAIN);
    sumLdr      += analogRead(PIN_LDR);
    delay(2);
  }

  int avgMoisture = sumMoisture / SAMPLES;
  int avgRain     = sumRain / SAMPLES;
  int avgLdr      = sumLdr / SAMPLES;

  station.rawMoistureAdc = avgMoisture;
  station.rawRainAdc     = avgRain;
  station.rawLdrAdc      = avgLdr;

  // A. Penilaian Sensor Kelembapan Tanah
  if (avgMoisture < 350 || avgMoisture > 4050) {
    station.sensorConnected = false;
    station.moisturePct     = 0;
  } else {
    station.sensorConnected = true;
    int mPct = map(avgMoisture, MOISTURE_AIR, MOISTURE_WATER, 0, 100);
    station.moisturePct = constrain(mPct, 0, 100);
  }

  // B. Penilaian Sensor Hujan
  // Pada kebanyakan modul hujan: Kering = ADC Tinggi (~4000), Basah = ADC Rendah (~1200)
  if (avgRain < RAIN_THRESHOLD) {
    station.rainDetected = true;
    int rPct = map(avgRain, RAIN_DRY_ADC, RAIN_WET_ADC, 0, 100);
    station.rainIntensityPct = constrain(rPct, 10, 100);
  } else {
    station.rainDetected     = false;
    station.rainIntensityPct = 0;
  }

  // C. Penilaian Sensor Cahaya LDR
  // Terang = ADC Rendah, Gelap = ADC Tinggi
  int lPct = map(avgLdr, LDR_DARK_ADC, LDR_BRIGHT_ADC, 0, 100);
  station.lightPct = constrain(lPct, 0, 100);
  station.isNight  = (station.lightPct < NIGHT_THRESHOLD);
}

// ========================================================================================
// 9. LOGIK PENGGERA AUDIO (BUZZER)
// ========================================================================================
void updateBuzzerLogic(unsigned long currentMillis) {
  // A. Ujian Manual dari Web (Priority Tertinggi)
  if (manualBuzzerTest) {
    if (currentMillis - buzzerStartTime < buzzerDuration) {
      digitalWrite(PIN_BUZZER, HIGH);
      station.buzzerActive = true;
      station.buzzerReason = "UJIAN WEB";
      return;
    } else {
      digitalWrite(PIN_BUZZER, LOW);
      manualBuzzerTest     = false;
      station.buzzerActive = false;
      station.buzzerReason = "STANDBY";
    }
  }

  // B. Semak sama ada Buzzer di-Mute dari Web
  if (!station.buzzerEnabled) {
    digitalWrite(PIN_BUZZER, LOW);
    station.buzzerActive = false;
    station.buzzerReason = "DISENYAPKAN (MUTED)";
    return;
  }

  // C. Penggera Hujan (Rhythmic Double Beep)
  if (station.rainDetected) {
    station.buzzerReason = "HUJAN DIKESAN!";
    // Corak bip berirama: 150ms bunyi, 150ms senyap
    int cycle = (currentMillis / 200) % 5;
    if (cycle == 0 || cycle == 2) {
      digitalWrite(PIN_BUZZER, HIGH);
      station.buzzerActive = true;
    } else {
      digitalWrite(PIN_BUZZER, LOW);
      station.buzzerActive = false;
    }
    return;
  }

  // D. Penggera Tanah Terlalu Kering (Periodic Short Beep)
  if (station.sensorConnected && station.moisturePct < 20) {
    station.buzzerReason = "TANAH KRITIKAL KERING";
    // Corak bip amaran: Bip 100ms setiap 3 saat
    if ((currentMillis % 3000) < 150) {
      digitalWrite(PIN_BUZZER, HIGH);
      station.buzzerActive = true;
    } else {
      digitalWrite(PIN_BUZZER, LOW);
      station.buzzerActive = false;
    }
    return;
  }

  // E. Keadaan Biasa (Standby / Aman)
  digitalWrite(PIN_BUZZER, LOW);
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

  // Baris 1: Kelembapan Tanah
  display.setCursor(0, 14);
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

  // Baris 2: Sensor Hujan
  display.setCursor(0, 26);
  display.print("Hujan : ");
  if (station.rainDetected) {
    display.print("HUJAN! (");
    display.print(station.rainIntensityPct);
    display.print("%)");
  } else {
    display.print("KERING (0%)");
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

  StaticJsonDocument<384> doc;
  doc["moisture_pct"]       = station.moisturePct;
  doc["raw_moisture_adc"]   = station.rawMoistureAdc;
  doc["rain_detected"]      = station.rainDetected;
  doc["rain_intensity_pct"] = station.rainIntensityPct;
  doc["raw_rain_adc"]       = station.rawRainAdc;
  doc["light_pct"]          = station.lightPct;
  doc["raw_ldr_adc"]        = station.rawLdrAdc;
  doc["is_night"]           = station.isNight;
  doc["buzzer_active"]      = station.buzzerActive;
  doc["buzzer_reason"]      = station.buzzerReason;
  doc["sensor_connected"]   = station.sensorConnected;

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
    DynamicJsonDocument doc(512);
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
        digitalWrite(PIN_BUZZER, HIGH);
      } else if (action == "MUTE") {
        station.buzzerEnabled = false;
        digitalWrite(PIN_BUZZER, LOW);
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
    DynamicJsonDocument sDoc(256);
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

  StaticJsonDocument<128> doc;
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

  StaticJsonDocument<256> doc;
  doc["moisture_pct"]       = station.moisturePct;
  doc["rain_intensity_pct"] = station.rainIntensityPct;
  doc["rain_detected"]      = station.rainDetected;
  doc["light_pct"]          = station.lightPct;
  doc["is_night"]           = station.isNight;
  doc["buzzer_state"]       = station.buzzerActive;

  String requestBody;
  serializeJson(doc, requestBody);
  http.POST(requestBody);
  http.end();
}
