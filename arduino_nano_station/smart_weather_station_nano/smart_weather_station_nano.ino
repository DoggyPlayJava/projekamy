/*
  =============================================================================
  STESEN AMARAN CUACA & IKLIM ATMOSFERA PINTAR IOT (POLISAS)
  Platform: Arduino Nano (ATmega328P) + Web Serial Bridge
  
  Komponen & Pemetaan Pin (Arduino Nano 5V):
  - DHT11 (Suhu & Kelembapan Udara) : Pin Digital D2
  - Sensor Cahaya LDR (Pin AO)      : Pin Analog A0 (DO tidak digunakan)
  - Penggera Buzzer Aktif           : Pin Digital D8 (Active LOW)
  - Skrin Paparan OLED I2C SSD1306  : SDA -> Pin A4, SCL -> Pin A5
  
  Komunikasi:
  - Baud Rate: 115200 bps melalui kabel USB ke Web Serial Dashboard
  - Format Penghantaran: JSON Telemetri Masa Nyata
  - Menerima Perintah: TEST_BUZZER, MUTE, UNMUTE
  =============================================================================
*/

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <ArduinoJson.h>

// --- Definisi Pin Perkakasan ---
#define DHT_PIN       2
#define DHT_TYPE      DHT11
#define LDR_PIN       A0
#define BUZZER_PIN    8

// Logik Buzzer Active LOW
#define BUZZER_ON     LOW
#define BUZZER_OFF    HIGH

// Definisi Skrin OLED 128x64
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C

// Ambang Penggera Cuaca
#define TEMP_ALERT_THRESHOLD    35.0 // Darjah Celsius
#define HEAT_INDEX_DANGER       38.0 // Darjah Celsius
#define DRY_HUMIDITY_THRESHOLD  40   // % RH
#define NIGHT_LIGHT_THRESHOLD   25   // % Kecerahan

// Inisialisasi Objek
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(DHT_PIN, DHT_TYPE);

// Pembolehubah Sensor & Status
float temperature = 28.0;
float humidity = 65.0;
float heatIndex = 29.5;
int lightPct = 50;
int rawLdrAdc = 500;
bool isNight = false;
bool buzzerEnabled = true;
bool buzzerActive = false;
String buzzerReason = "STANDBY";

// Pemasa Latar Belakang (Non-blocking Millis)
unsigned long lastSensorRead = 0;
unsigned long lastSerialSend = 0;
unsigned long buzzerBeepTimer = 0;
unsigned long testBuzzerEnd = 0;
bool testBuzzerRunning = false;
int buzzerBeepState = 0;

// Pengiraan Indeks Haba (Heat Index / Rothfusz Regression Formula)
float calculateHeatIndex(float tempC, float hum) {
  float T = (tempC * 9.0 / 5.0) + 32.0;
  float R = hum;
  
  float hi = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094));
  if (hi >= 80.0) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * R
         - 0.22475541 * T * R - 0.00683783 * T * T
         - 0.05481717 * R * R + 0.00122874 * T * T * R
         + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
         
    if ((R < 13.0) && (T >= 80.0) && (T <= 112.0)) {
      hi -= ((13.0 - R) / 4.0) * sqrt((17.0 - abs(T - 95.0)) / 17.0);
    } else if ((R > 85.0) && (T >= 80.0) && (T <= 87.0)) {
      hi += ((R - 85.0) / 10.0) * ((87.0 - T) / 5.0);
    }
  }
  return (hi - 32.0) * 5.0 / 9.0;
}

// Kemaskini Paparan Skrin OLED
void updateOLED() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Pengepala
  display.setTextSize(1);
  display.setCursor(6, 0);
  display.print(F("STESEN CUACA NANO"));
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);

  // Baris Suhu & Kelembapan
  display.setCursor(0, 14);
  display.print(F("Suhu: "));
  display.print(temperature, 1);
  display.print(F("C"));

  display.setCursor(76, 14);
  display.print(F("RH:"));
  display.print((int)humidity);
  display.print(F("%"));

  // Baris Indeks Haba & Cahaya
  display.setCursor(0, 26);
  display.print(F("H.Index: "));
  display.print(heatIndex, 1);
  display.print(F("C"));

  display.setCursor(0, 38);
  display.print(F("Cahaya : "));
  display.print(lightPct);
  display.print(F("% ("));
  display.print(isNight ? F("Malam") : F("Siang"));
  display.print(F(")"));

  // Baris Status Sistem & Penggera
  display.drawFastHLine(0, 50, 128, SSD1306_WHITE);
  display.setCursor(0, 54);
  if (!buzzerEnabled) {
    display.print(F("[BUZZER MUTED]"));
  } else if (buzzerActive) {
    display.print(F("! AMARAN: "));
    display.print(buzzerReason);
  } else {
    display.print(F("USB Link: SEDIA"));
  }

  display.display();
}

// Kawalan Penggera Buzzer
void handleBuzzer() {
  unsigned long now = millis();

  // 1. Jika mod ujian 2 saat sedang berjalan
  if (testBuzzerRunning) {
    if (now < testBuzzerEnd) {
      digitalWrite(BUZZER_PIN, BUZZER_ON);
      buzzerActive = true;
      buzzerReason = "UJIAN";
      return;
    } else {
      testBuzzerRunning = false;
      digitalWrite(BUZZER_PIN, BUZZER_OFF);
      buzzerActive = false;
      buzzerReason = "STANDBY";
    }
  }

  // Jika buzzer disenyapkan secara manual
  if (!buzzerEnabled) {
    digitalWrite(BUZZER_PIN, BUZZER_OFF);
    buzzerActive = false;
    buzzerReason = "MUTED";
    return;
  }

  // 2. Keadaan Gelombang Haba Melampau (Bip pantas)
  if (temperature >= TEMP_ALERT_THRESHOLD || heatIndex >= HEAT_INDEX_DANGER) {
    buzzerActive = true;
    buzzerReason = "HABA MELAMPAU";
    if (now - buzzerBeepTimer > 200) {
      buzzerBeepTimer = now;
      buzzerBeepState = !buzzerBeepState;
      digitalWrite(BUZZER_PIN, buzzerBeepState ? BUZZER_ON : BUZZER_OFF);
    }
    return;
  }

  // 3. Keadaan Udara Sangat Kering (Bip berselang 1.5 saat)
  if (humidity > 0 && humidity < DRY_HUMIDITY_THRESHOLD) {
    buzzerActive = true;
    buzzerReason = "UDARA KERING";
    if (now - buzzerBeepTimer > 1500) {
      buzzerBeepTimer = now;
      digitalWrite(BUZZER_PIN, BUZZER_ON);
      delay(80); // bip pendek
      digitalWrite(BUZZER_PIN, BUZZER_OFF);
    }
    return;
  }

  // Tiada amaran
  buzzerActive = false;
  buzzerReason = "STANDBY";
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

// Terima & Proses Perintah Masuk daripada Web Serial
void processSerialCommands() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() == 0) return;

    // Sokong format teks ringkas atau JSON
    if (input.indexOf("TEST_BUZZER") >= 0) {
      testBuzzerRunning = true;
      testBuzzerEnd = millis() + 2000;
      Serial.println(F("{\"ack\":\"TEST_BUZZER\",\"status\":\"OK\"}"));
    } else if (input.indexOf("MUTE") >= 0 && input.indexOf("UNMUTE") < 0) {
      buzzerEnabled = false;
      digitalWrite(BUZZER_PIN, BUZZER_OFF);
      Serial.println(F("{\"ack\":\"MUTE\",\"status\":\"OK\"}"));
    } else if (input.indexOf("UNMUTE") >= 0) {
      buzzerEnabled = true;
      Serial.println(F("{\"ack\":\"UNMUTE\",\"status\":\"OK\"}"));
    }
  }
}

// Hantar Data Telemetri JSON ke Web Serial Dashboard
void sendTelemetryJSON() {
  JsonDocument doc;
  doc["temp"] = round(temperature * 10.0) / 10.0;
  doc["hum"] = round(humidity);
  doc["hi"] = round(heatIndex * 10.0) / 10.0;
  doc["light"] = lightPct;
  doc["raw_ldr"] = rawLdrAdc;
  doc["night"] = isNight;
  doc["buzzer"] = buzzerActive;
  doc["buzzer_en"] = buzzerEnabled;
  doc["reason"] = buzzerReason;
  doc["uptime"] = millis() / 1000;

  serializeJson(doc, Serial);
  Serial.println();
}

void setup() {
  // Mulakan komunikasi bersiri USB
  Serial.begin(115200);

  // Pastikan buzzer senyap semasa but (Active LOW -> HIGH)
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);

  // Mulakan sensor DHT11
  dht.begin();

  // Mulakan skrin OLED SSD1306 pada pin I2C A4 (SDA) dan A5 (SCL)
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 16);
    display.println(F("STESEN CUACA IOT"));
    display.setCursor(18, 30);
    display.println(F("POLISAS - NANO"));
    display.setCursor(14, 46);
    display.println(F("Sedia Untuk USB"));
    display.display();
    delay(1200);
  }

  Serial.println(F("{\"status\":\"BOOT_OK\",\"board\":\"Arduino Nano (ATmega328P)\"}"));
}

void loop() {
  unsigned long now = millis();

  // 1. Semak perintah bersiri dari Web Serial Dashboard
  processSerialCommands();

  // 2. Bacaan Sensor Berkala (Setiap 1.5 saat)
  if (now - lastSensorRead >= 1500) {
    lastSensorRead = now;

    // Baca DHT11
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      temperature = t;
      humidity = h;
      heatIndex = calculateHeatIndex(temperature, humidity);
    }

    // Baca Sensor Cahaya LDR (Analog A0: 0 - 1023)
    rawLdrAdc = analogRead(LDR_PIN);
    // Sensor LDR modul: Voltan tinggi bila terang, rendah bila gelap
    lightPct = map(rawLdrAdc, 0, 1023, 0, 100);
    lightPct = constrain(lightPct, 0, 100);
    isNight = (lightPct < NIGHT_LIGHT_THRESHOLD);

    // Kemaskini paparan skrin fizikal OLED
    updateOLED();
  }

  // 3. Kawalan Penggera Buzzer
  handleBuzzer();

  // 4. Hantar Telemetri ke Dashboard melalui USB Serial setiap 1 saat
  if (now - lastSerialSend >= 1000) {
    lastSerialSend = now;
    sendTelemetryJSON();
  }
}
