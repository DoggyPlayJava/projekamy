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

// --- Definisi Pin Perkakasan (Mematuhi Rubrik DEC30182) ---
#define DHT_PIN       2   // Digital Input: Sensor Suhu & Kelembapan DHT11
#define DHT_TYPE      DHT11
#define BUTTON_PIN    3   // Digital Input: Suis Sampukan Luaran (External Interrupt INT1)
#define LED_PIN       7   // Output Jenis 2: Visual (LED Amaran Cuaca / Heartbeat)
#define BUZZER_PIN    8   // Output Jenis 1: Audio (Buzzer Aktif - Active LOW)
#define LDR_PIN       A0  // Analog Input: Saluran ADC 10-bit (Sensor Cahaya LDR)

// Logik Buzzer Active LOW
#define BUZZER_ON     LOW
#define BUZZER_OFF    HIGH

// Definisi Skrin OLED 128x64 (Protokol Serial I²C: SDA -> A4, SCL -> A5)
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
bool ledActive = false;
const char* buzzerReason = "STANDBY";

// Pembolehubah Sampukan (Interrupt Variables - Wajib volatile)
volatile unsigned long interruptCount = 0;
volatile bool emergencySnoozeActive = false;
volatile bool timer1Tick = false;
unsigned long ledHeartbeatEnd = 0;

// Pemasa Latar Belakang (Non-blocking Millis)
unsigned long lastSensorRead = 0;
unsigned long lastSerialSend = 0;
unsigned long buzzerBeepTimer = 0;
unsigned long testBuzzerEnd = 0;
bool testBuzzerRunning = false;
int buzzerBeepState = 0;

// ---------------------------------------------------------------------------
// RUTIN PERKHIDMATAN SAMPUKAN (INTERRUPT SERVICE ROUTINES - ISR)
// ---------------------------------------------------------------------------

// 1. External Hardware Interrupt (INT1 - Pin D3)
void handleEmergencyButtonISR() {
  interruptCount++;
  // Butang memintas pemprosesan serta-merta untuk Mute/Unmute kecemasan
  emergencySnoozeActive = !emergencySnoozeActive;
  if (emergencySnoozeActive) {
    buzzerEnabled = false;
  } else {
    buzzerEnabled = true;
  }
}

// 2. Hardware Timer1 CTC 1-Hz Interrupt (Pemasa Latar Belakang)
ISR(TIMER1_COMPA_vect) {
  timer1Tick = true;
}

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

  // Baris Status Sistem, Dwi-Output & Sampukan (INT1)
  display.drawFastHLine(0, 50, 128, SSD1306_WHITE);
  display.setCursor(0, 54);
  if (!buzzerEnabled) {
    display.print(F("[MUTED]"));
  } else if (buzzerActive) {
    display.print(F("!AMARAN!"));
  } else {
    display.print(F("NORM"));
  }

  // Tunjukkan Status Output & Kiraan Sampukan (Wajib DEC30182)
  display.setCursor(54, 54);
  display.print(ledActive ? F("LED:1") : F("LED:0"));
  display.setCursor(92, 54);
  display.print(F("I:"));
  display.print(interruptCount);

  display.display();
}

// Kawalan Dwijenis Peranti Output: Audio (Buzzer D8) & Visual (LED D7)
void handleOutputs() {
  unsigned long now = millis();

  // 1. Jika mod ujian 2 saat sedang berjalan (Perintah Web / Ujian)
  if (testBuzzerRunning) {
    if (now < testBuzzerEnd) {
      digitalWrite(BUZZER_PIN, BUZZER_ON);
      digitalWrite(LED_PIN, HIGH);
      buzzerActive = true;
      ledActive = true;
      buzzerReason = "UJIAN WEB";
      return;
    } else {
      testBuzzerRunning = false;
      digitalWrite(BUZZER_PIN, BUZZER_OFF);
      digitalWrite(LED_PIN, LOW);
      buzzerActive = false;
      ledActive = false;
      buzzerReason = "STANDBY";
    }
  }

  // Jika sistem disenyapkan secara manual atau melalui ISR Suis Butang D3
  if (!buzzerEnabled) {
    digitalWrite(BUZZER_PIN, BUZZER_OFF);
    buzzerActive = false;
    buzzerReason = "MUTED";
    // Semasa mute, jika pemasa Timer1 berdetik, kelip ringkas LED penunjuk
    if (timer1Tick) {
      timer1Tick = false;
      ledHeartbeatEnd = now + 40;
      digitalWrite(LED_PIN, HIGH);
      ledActive = true;
    }
    if (now > ledHeartbeatEnd && ledActive) {
      digitalWrite(LED_PIN, LOW);
      ledActive = false;
    }
    return;
  }

  // 2. Keadaan Gelombang Haba Melampau (Bip pantas & LED Kelip Laju)
  if (temperature >= TEMP_ALERT_THRESHOLD || heatIndex >= HEAT_INDEX_DANGER) {
    buzzerActive = true;
    buzzerReason = "HABA MELAMPAU";
    if (now - buzzerBeepTimer > 200) {
      buzzerBeepTimer = now;
      buzzerBeepState = !buzzerBeepState;
      digitalWrite(BUZZER_PIN, buzzerBeepState ? BUZZER_ON : BUZZER_OFF);
      digitalWrite(LED_PIN, buzzerBeepState ? HIGH : LOW);
      ledActive = (buzzerBeepState != 0);
    }
    return;
  }

  // 3. Keadaan Udara Sangat Kering (Bip berselang 1.5 saat & LED Amaran)
  if (humidity > 0 && humidity < DRY_HUMIDITY_THRESHOLD) {
    buzzerActive = true;
    buzzerReason = "UDARA KERING";
    if (now - buzzerBeepTimer > 1500) {
      buzzerBeepTimer = now;
      digitalWrite(BUZZER_PIN, BUZZER_ON);
      digitalWrite(LED_PIN, HIGH);
      ledActive = true;
      delay(80); // bip & kelip pendek
      digitalWrite(BUZZER_PIN, BUZZER_OFF);
      digitalWrite(LED_PIN, LOW);
      ledActive = false;
    }
    return;
  }

  // 4. Keadaan Normal (Tiada Amaran Cuaca):
  buzzerActive = false;
  buzzerReason = "STANDBY";
  digitalWrite(BUZZER_PIN, BUZZER_OFF);

  // LED berkelip lembut (Heartbeat) menggunakan Timer1 1-Hz Hardware Interrupt
  if (timer1Tick) {
    timer1Tick = false;
    ledHeartbeatEnd = now + 60; // Nyala 60ms setiap 1 saat tanda mikropengawal aktif
    digitalWrite(LED_PIN, HIGH);
    ledActive = true;
  }
  if (now > ledHeartbeatEnd && ledActive) {
    digitalWrite(LED_PIN, LOW);
    ledActive = false;
  }
}

// Penimbal Arahan Bersiri (Non-blocking)
char rxBuffer[32];
byte rxIndex = 0;

// Terima & Proses Perintah Masuk daripada Web Serial
void processSerialCommands() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (rxIndex > 0) {
        rxBuffer[rxIndex] = '\0';

        // 1. Perintah Ujian Buzzer 2 Saat
        if (strstr(rxBuffer, "TEST_BUZZER") != NULL || strstr(rxBuffer, "TEST") != NULL) {
          testBuzzerRunning = true;
          testBuzzerEnd = millis() + 2000;
          digitalWrite(BUZZER_PIN, BUZZER_ON);
          digitalWrite(LED_PIN, HIGH);
          buzzerActive = true;
          ledActive = true;
          buzzerReason = "UJIAN WEB";
          Serial.println(F("{\"ack\":\"TEST_BUZZER\",\"status\":\"OK\"}"));
        } 
        // 2. Perintah Nyahsenyap (Unmute)
        else if (strstr(rxBuffer, "UNMUTE") != NULL) {
          buzzerEnabled = true;
          emergencySnoozeActive = false;
          Serial.println(F("{\"ack\":\"UNMUTE\",\"status\":\"OK\"}"));
        } 
        // 3. Perintah Senyap (Mute)
        else if (strstr(rxBuffer, "MUTE") != NULL) {
          buzzerEnabled = false;
          emergencySnoozeActive = true;
          digitalWrite(BUZZER_PIN, BUZZER_OFF);
          digitalWrite(LED_PIN, LOW);
          Serial.println(F("{\"ack\":\"MUTE\",\"status\":\"OK\"}"));
        }
        rxIndex = 0;
      }
    } else {
      if (rxIndex < sizeof(rxBuffer) - 1) {
        rxBuffer[rxIndex++] = c;
      }
    }
  }
}

// Hantar Data Telemetri JSON ke Web Serial Dashboard (Sifar Heap / 100% PROGMEM Safe)
void sendTelemetryJSON() {
  Serial.print(F("{\"temp\":"));
  Serial.print(temperature, 1);
  Serial.print(F(",\"hum\":"));
  Serial.print((int)humidity);
  Serial.print(F(",\"hi\":"));
  Serial.print(heatIndex, 1);
  Serial.print(F(",\"light\":"));
  Serial.print(lightPct);
  Serial.print(F(",\"raw_ldr\":"));
  Serial.print(rawLdrAdc);
  Serial.print(F(",\"night\":"));
  Serial.print(isNight ? F("true") : F("false"));
  Serial.print(F(",\"buzzer\":"));
  Serial.print(buzzerActive ? F("true") : F("false"));
  Serial.print(F(",\"buzzer_en\":"));
  Serial.print(buzzerEnabled ? F("true") : F("false"));
  Serial.print(F(",\"led\":"));
  Serial.print(ledActive ? F("true") : F("false"));
  Serial.print(F(",\"int_cnt\":"));
  Serial.print(interruptCount);
  Serial.print(F(",\"reason\":\""));
  Serial.print(buzzerReason);
  Serial.print(F("\",\"uptime\":"));
  Serial.print(millis() / 1000);
  Serial.println(F("}"));
}

void setup() {
  // 1. Mulakan komunikasi bersiri USB (UART: 115200 bps)
  Serial.begin(115200);

  // 2. Konfigurasi Output Jenis 1: Buzzer Aktif (Active LOW -> HIGH untuk senyap)
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);

  // 3. Konfigurasi Output Jenis 2: LED Amaran Cuaca (Pin D7)
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // 4. Konfigurasi Digital Input & External Interrupt INT1 (Pin D3 Suis Butang)
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), handleEmergencyButtonISR, FALLING);

  // 5. Konfigurasi Hardware Timer1 CTC 1-Hz Interrupt (Pemasa Perkakasan ATmega328P)
  cli(); // Hentikan sampukan sementara
  TCCR1A = 0;
  TCCR1B = 0;
  TCNT1  = 0;
  OCR1A  = 15624; // (16*10^6) / (1024 * 1Hz) - 1 = 15624
  TCCR1B |= (1 << WGM12); // CTC Mode
  TCCR1B |= (1 << CS12) | (1 << CS10); // Prescaler 1024
  TIMSK1 |= (1 << OCIE1A); // Dayakan Compare Match Interrupt
  sei(); // Aktifkan semua sampukan semula

  // 6. Mulakan sensor DHT11 (Digital Input Pin D2)
  dht.begin();

  // 7. Mulakan skrin OLED SSD1306 pada pin I2C A4 (SDA) dan A5 (SCL)
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

  // Bacaan awal sensor supaya paparan metrik muncul serta-merta
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    temperature = t;
    humidity = h;
    heatIndex = calculateHeatIndex(temperature, humidity);
  }
  rawLdrAdc = analogRead(LDR_PIN);
  lightPct = 100 - map(rawLdrAdc, 0, 1023, 0, 100);
  lightPct = constrain(lightPct, 0, 100);
  isNight = (lightPct < NIGHT_LIGHT_THRESHOLD);

  // Kemaskini paparan skrin metrik serta-merta selepas skrin alu-aluan
  updateOLED();

  Serial.println(F("{\"status\":\"BOOT_OK\",\"board\":\"Arduino Nano (ATmega328P)\",\"interrupts\":\"INT1+TIMER1\",\"outputs\":\"BUZZER+LED\"}"));
  sendTelemetryJSON();
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
    lightPct = 100 - map(rawLdrAdc, 0, 1023, 0, 100);
    lightPct = constrain(lightPct, 0, 100);
    isNight = (lightPct < NIGHT_LIGHT_THRESHOLD);

    // Kemaskini paparan skrin fizikal OLED
    updateOLED();
  }

  // 3. Kawalan Dwijenis Peranti Output (Buzzer D8 + LED D7)
  handleOutputs();

  // 4. Hantar Telemetri ke Dashboard melalui USB Serial setiap 1 saat
  if (now - lastSerialSend >= 1000) {
    lastSerialSend = now;
    sendTelemetryJSON();
  }
}
