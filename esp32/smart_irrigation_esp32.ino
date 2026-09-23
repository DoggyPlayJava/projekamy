/*
  ========================================================================================
  PROJEK SISTEM PENGAIRAN PINTAR (SMART IRRIGATION SYSTEM)
  POLITEKNIK SULTAN HAJI AHMAD SHAH (POLISAS) - JABATAN KEJURUTERAAN MEKANIKAL
  
  Mikropengawal : ESP32 NodeMCU 30-Pin (ESP-WROOM-32)
  Komponen      : 4x Soil Moisture Sensors, 1x 4-Channel Relay Module, 4x Mini Pumps 5V
  Cloud Platform: Supabase PostgreSQL (REST API & Realtime WebSockets)
  Papan Pemuka  : Web Dashboard (Modern Glassmorphism Agro)
  
  PINOUT ESP32:
  - Sensor Pasu 1 (A0) : GPIO 32 (ADC1_CH4)
  - Sensor Pasu 2 (A0) : GPIO 33 (ADC1_CH5)
  - Sensor Pasu 3 (A0) : GPIO 34 (ADC1_CH6)
  - Sensor Pasu 4 (A0) : GPIO 35 (ADC1_CH7)
  - Relay IN1 (Pam 1)  : GPIO 18 (Active-LOW: LOW = ON, HIGH = OFF)
  - Relay IN2 (Pam 2)  : GPIO 19
  - Relay IN3 (Pam 3)  : GPIO 21
  - Relay IN4 (Pam 4)  : GPIO 22
  - Onboard Status LED : GPIO 2
  ========================================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ========================================================================================
// 1. KONFIGURASI WIFI & SUPABASE (SILA TUKAR NAMA WIFI & PASSWORD ANDA DI SINI)
// ========================================================================================
const char* WIFI_SSID     = "NAMA_WIFI_ATAU_HOTSPOT_ANDA";   // Contoh: "Hotspot Saya"
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";           // Contoh: "12345678"

// URL & Anon Key Supabase Projek Anda
const char* SUPABASE_URL  = "https://adqhtjzbzeyiuzvdujnf.supabase.co";
const char* SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcWh0anpiemV5aXV6dmR1am5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNjg4MTAsImV4cCI6MjEwNTc0NDgxMH0.APe7LZp9h9waNWZYYdu-fYt1kvgmFNGCozBYE1nG3bc";

// ========================================================================================
// 2. PENENTUKURAN SENSOR (CALIBRATION) & TETAPAN MASA
// ========================================================================================
// Nilai mentah ADC (12-bit: 0 - 4095). Ubah nilai ini jika perlu selepas uji di Serial Monitor
const int AIR_VALUE   = 3500;  // Nilai analog bila sensor kering di udara (0% Lembap)
const int WATER_VALUE = 1500;  // Nilai analog bila sensor terendam dalam air (100% Lembap)

// Tetapan Masa (Milisaat)
const unsigned long SYNC_INTERVAL     = 5000;   // Hantar data ke Supabase setiap 5 saat
const unsigned long POLL_INTERVAL     = 2000;   // Semak arahan web manual setiap 2 saat
const unsigned long LOG_SAVE_INTERVAL = 60000;  // Simpan ke moisture_logs setiap 1 minit
const unsigned long DEFAULT_WATER_MS  = 5000;   // Tempoh pam berjalan: 5 saat
const unsigned long COOLDOWN_MS       = 30000;  // Masa rehat 30 saat selepas siram sebelum nilai semula

// ========================================================================================
// 3. DEFINISI PIN & STRUKTUR DATA PASU
// ========================================================================================
const int NUM_POTS = 4;
const int SENSOR_PINS[NUM_POTS] = {32, 33, 34, 35};
const int RELAY_PINS[NUM_POTS]  = {18, 19, 21, 22};
const int LED_STATUS_PIN        = 2;

// Logik Relay Active-LOW (Kebanyakan modul relay biru Arduino beroperasi begini)
const int RELAY_ON  = LOW;
const int RELAY_OFF = HIGH;

struct PotData {
  int id;
  int rawAdc;
  int moisturePct;
  int thresholdPct;
  bool autoMode;
  bool pumpActive;
  unsigned long pumpStartTime;
  unsigned long pumpDuration;
  unsigned long lastWateredTime;
  String triggerType;
};

PotData pots[NUM_POTS];

unsigned long lastSyncTime    = 0;
unsigned long lastPollTime    = 0;
unsigned long lastLogSaveTime = 0;

// ========================================================================================
// 4. SETUP FUNGSI PERMULAAN
// ========================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("  SISTEM PENGAIRAN PINTAR (POLISAS) - ESP32 MEMULAKAN...");
  Serial.println("========================================================");

  // Konfigurasi Pin Status LED
  pinMode(LED_STATUS_PIN, OUTPUT);
  digitalWrite(LED_STATUS_PIN, LOW);

  // Inisialisasi Pin Relay & Sensor
  for (int i = 0; i < NUM_POTS; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], RELAY_OFF); // Pastikan pam mati sewaktu startup

    pinMode(SENSOR_PINS[i], INPUT);

    pots[i].id              = i + 1;
    pots[i].rawAdc          = 0;
    pots[i].moisturePct     = 50;
    pots[i].thresholdPct    = 35; // Nilai ambang lalai (35%)
    pots[i].autoMode        = true;
    pots[i].pumpActive      = false;
    pots[i].pumpStartTime   = 0;
    pots[i].pumpDuration    = DEFAULT_WATER_MS;
    pots[i].lastWateredTime = 0;
    pots[i].triggerType     = "AUTO";
  }

  // Sambungkan ke WiFi
  connectToWiFi();

  // Muat turun tetapan awal (threshold & auto_mode) daripada Supabase
  fetchRemoteSettings();

  Serial.println("[ESP32] Sistem sedia beroperasi!");
}

// ========================================================================================
// 5. GELUNG UTAMA (MAIN LOOP)
// ========================================================================================
void loop() {
  maintainWiFi();
  unsigned long currentMillis = millis();

  // 1. Baca semua sensor tanah secara berterusan (dengan penapisan purata 10 sampel)
  readAllSensors();

  // 2. Kawalan pemasaan pam yang sedang aktif (Non-blocking timer)
  handleActivePumps(currentMillis);

  // 3. Logik penyiraman automatik (jika kelembapan <= threshold & cukup masa rehat)
  handleAutoIrrigation(currentMillis);

  // 4. Semak arahan manual dari Web Dashboard (setiap 2 saat)
  if (currentMillis - lastPollTime >= POLL_INTERVAL) {
    lastPollTime = currentMillis;
    pollPendingCommands();
  }

  // 5. Hantar status terkini ke Supabase (setiap 5 saat)
  if (currentMillis - lastSyncTime >= SYNC_INTERVAL) {
    lastSyncTime = currentMillis;
    syncPotStatusToCloud();
  }

  // 6. Simpan rekod graf sejarah ke moisture_logs (setiap 1 minit)
  if (currentMillis - lastLogSaveTime >= LOG_SAVE_INTERVAL) {
    lastLogSaveTime = currentMillis;
    saveMoistureLogs();
  }

  delay(20); // Penstabilan gelung kecil
}

// ========================================================================================
// 6. PEMBACAAN SENSOR & PENAPISAN HINGAR (10-SAMPLE SMOOTHING)
// ========================================================================================
void readAllSensors() {
  for (int i = 0; i < NUM_POTS; i++) {
    long sum = 0;
    const int SAMPLES = 10;
    for (int s = 0; s < SAMPLES; s++) {
      sum += analogRead(SENSOR_PINS[i]);
      delay(2);
    }
    int avgAdc = sum / SAMPLES;
    pots[i].rawAdc = avgAdc;

    // Tukar ADC kepada peratus (Semakin rendah ADC, semakin lembap tanah)
    int pct = map(avgAdc, AIR_VALUE, WATER_VALUE, 0, 100);
    pct = constrain(pct, 0, 100);
    pots[i].moisturePct = pct;
  }
}

// ========================================================================================
// 7. LOGIK KAWALAN PAM AIR
// ========================================================================================
void startPump(int potIdx, unsigned long durationMs, const String& triggerType) {
  if (potIdx < 0 || potIdx >= NUM_POTS) return;
  if (pots[potIdx].pumpActive) return; // Pam sudah pun berjalan

  Serial.printf("[PAM] Menghidupkan Pam Pasu %d selama %lu saat (%s)\n", 
                potIdx + 1, durationMs / 1000, triggerType.c_str());

  digitalWrite(RELAY_PINS[potIdx], RELAY_ON);
  pots[potIdx].pumpActive      = true;
  pots[potIdx].pumpStartTime   = millis();
  pots[potIdx].pumpDuration    = durationMs;
  pots[potIdx].triggerType     = triggerType;
  pots[potIdx].lastWateredTime = millis();

  // Segerakan kemaskini ke cloud supaya website nampak animasi pam aktif serta-merta
  syncSinglePotStatus(potIdx);
}

void stopPump(int potIdx) {
  if (potIdx < 0 || potIdx >= NUM_POTS) return;
  if (!pots[potIdx].pumpActive) return;

  Serial.printf("[PAM] Mematikan Pam Pasu %d\n", potIdx + 1);
  digitalWrite(RELAY_PINS[potIdx], RELAY_OFF);
  pots[potIdx].pumpActive = false;

  // Log sesi siraman ke jadual watering_logs di Supabase
  recordWateringLog(potIdx, pots[potIdx].triggerType, pots[potIdx].pumpDuration / 1000, pots[potIdx].moisturePct);

  // Kemaskini status pasu di cloud
  syncSinglePotStatus(potIdx);
}

void handleActivePumps(unsigned long currentMillis) {
  for (int i = 0; i < NUM_POTS; i++) {
    if (pots[i].pumpActive) {
      if (currentMillis - pots[i].pumpStartTime >= pots[i].pumpDuration) {
        stopPump(i);
      }
    }
  }
}

void handleAutoIrrigation(unsigned long currentMillis) {
  for (int i = 0; i < NUM_POTS; i++) {
    // Jika mod auto aktif, pam tidak aktif, dan kelembapan bawah paras ambang
    if (pots[i].autoMode && !pots[i].pumpActive) {
      if (pots[i].moisturePct <= pots[i].thresholdPct) {
        // Semak tempoh bertenang (cooldown) untuk elak limpahan air
        if (pots[i].lastWateredTime == 0 || (currentMillis - pots[i].lastWateredTime >= COOLDOWN_MS)) {
          Serial.printf("[AUTO-SIRAM] Pasu %d kering (%d%% <= %d%%). Memulakan siraman...\n", 
                        i + 1, pots[i].moisturePct, pots[i].thresholdPct);
          startPump(i, DEFAULT_WATER_MS, "AUTO");
        }
      }
    }
  }
}

// ========================================================================================
// 8. KOMUNIKASI SUPABASE REST API
// ========================================================================================
void syncPotStatusToCloud() {
  if (WiFi.status() != WL_CONNECTED) return;

  for (int i = 0; i < NUM_POTS; i++) {
    syncSinglePotStatus(i);
  }
}

void syncSinglePotStatus(int potIdx) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Membenarkan HTTPS tanpa perakuan SSL tempatan yang berat
  HTTPClient http;

  String endpoint = String(SUPABASE_URL) + "/rest/v1/pot_status?pot_id=eq." + String(pots[potIdx].id);
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<256> doc;
  doc["moisture_pct"] = pots[potIdx].moisturePct;
  doc["raw_adc"]      = pots[potIdx].rawAdc;
  doc["pump_state"]   = pots[potIdx].pumpActive;
  // doc["updated_at"] dijana automatik atau boleh dihantar

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.PATCH(requestBody);
  if (httpCode > 0 && (httpCode == 200 || httpCode == 204)) {
    // Berjaya
  } else {
    Serial.printf("[SUPABASE PATCH ERROR] Pasu %d: HTTP %d\n", potIdx + 1, httpCode);
  }
  http.end();
}

void fetchRemoteSettings() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(SUPABASE_URL) + "/rest/v1/pot_status?select=pot_id,threshold_pct,auto_mode";
  http.begin(client, endpoint);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    JsonArray array = doc.as<JsonArray>();

    for (JsonObject obj : array) {
      int pId = obj["pot_id"];
      if (pId >= 1 && pId <= NUM_POTS) {
        pots[pId - 1].thresholdPct = obj["threshold_pct"] | 35;
        pots[pId - 1].autoMode     = obj["auto_mode"] | true;
      }
    }
    Serial.println("[SUPABASE] Tetapan threshold & mod berjaya dimuat turun.");
  }
  http.end();
}

void pollPendingCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  // Dapatkan arahan manual berstatus PENDING yang paling awal
  String endpoint = String(SUPABASE_URL) + "/rest/v1/pump_commands?status=eq.PENDING&order=id.asc&limit=1";
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
      long cmdId          = cmd["id"];
      int targetPotId     = cmd["pot_id"];
      String action       = cmd["action"].as<String>();
      int durationSec     = cmd["duration_seconds"] | 5;

      Serial.printf("[WEB COMMAND] Arahan ID: %ld | Pasu: %d | Tindakan: %s | Tempoh: %d saat\n", 
                    cmdId, targetPotId, action.c_str(), durationSec);

      // Kemaskini status arahan kepada PROCESSING
      updateCommandStatus(cmdId, "PROCESSING");

      if (action == "WATER_NOW" && targetPotId >= 1 && targetPotId <= NUM_POTS) {
        startPump(targetPotId - 1, durationSec * 1000UL, "MANUAL");
      } else if (action == "STOP" && targetPotId >= 1 && targetPotId <= NUM_POTS) {
        stopPump(targetPotId - 1);
      }

      // Tandakan arahan sebagai COMPLETED
      updateCommandStatus(cmdId, "COMPLETED");
    }
  }
  http.end();
}

void updateCommandStatus(long cmdId, const String& newStatus) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(SUPABASE_URL) + "/rest/v1/pump_commands?id=eq." + String(cmdId);
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<128> doc;
  doc["status"] = newStatus;
  if (newStatus == "COMPLETED") {
    // doc["executed_at"] = ... (auto handled by Postgres trigger atau NULL)
  }

  String requestBody;
  serializeJson(doc, requestBody);
  http.PATCH(requestBody);
  http.end();
}

void recordWateringLog(int potIdx, const String& triggerType, int durationSec, int moistureBefore) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(SUPABASE_URL) + "/rest/v1/watering_logs";
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<256> doc;
  doc["pot_id"]           = pots[potIdx].id;
  doc["pot_name"]         = "Pasu " + String(pots[potIdx].id);
  doc["trigger_type"]     = triggerType;
  doc["duration_seconds"] = durationSec;
  doc["moisture_before"]  = moistureBefore;

  String requestBody;
  serializeJson(doc, requestBody);
  http.POST(requestBody);
  http.end();
}

void saveMoistureLogs() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String endpoint = String(SUPABASE_URL) + "/rest/v1/moisture_logs";
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  DynamicJsonDocument doc(512);
  JsonArray array = doc.to<JsonArray>();
  for (int i = 0; i < NUM_POTS; i++) {
    JsonObject item = array.createNestedObject();
    item["pot_id"]       = pots[i].id;
    item["moisture_pct"] = pots[i].moisturePct;
  }

  String requestBody;
  serializeJson(doc, requestBody);
  http.POST(requestBody);
  http.end();
}

// ========================================================================================
// 9. PENGURUSAN SAMBUNGAN WIFI
// ========================================================================================
void connectToWiFi() {
  Serial.printf("[WIFI] Menyambung ke rangkaian '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 25) {
    delay(500);
    digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN)); // Kelipkan LED semasa mencari WiFi
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_STATUS_PIN, HIGH); // Lampu LED kekal menyala bila berjaya disambung
    Serial.println("\n[WIFI] BERJAYA DISAMBUNG!");
    Serial.print("[WIFI] Alamat IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    digitalWrite(LED_STATUS_PIN, LOW);
    Serial.println("\n[WIFI] GAGAL DISAMBUNG! Sila semak nama SSID dan Password anda.");
  }
}

void maintainWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnectAttempt = 0;
    if (millis() - lastReconnectAttempt > 10000) {
      lastReconnectAttempt = millis();
      Serial.println("[WIFI] Sambungan terputus. Mencuba menyambung semula...");
      WiFi.reconnect();
    }
  }
}
