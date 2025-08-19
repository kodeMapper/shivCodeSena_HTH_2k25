# ESP32 Test Sketches for Dipex GPS

This folder contains simple ESP32 Arduino sketches to test your backend and frontend end-to-end with simulated sensor data.

All sketches use the same config in `config.h`. Update your WiFi, API base URL, and device ID there.

## Files

- `config.h` – Shared configuration (WiFi, API base, device id, timings, pins).
- `gps_random_test.ino` – GPS-only simulator. Sends random coordinates around Nagpur every 10s to `/api/update-location` with `X-Device-ID`.
- `steps_and_fall_test.ino` – Steps (+1 every 5s) and auto-fall after 30s to `/api/update-steps` and `/api/fall-detected`.
- `smartvision_full_sim.ino` – Full simulator:
  - GPS every 10s
  - Steps +1 every 5s
  - Fall auto after 30s OR failsafe when button not pressed for 10s
  - Lidar and water detection simulated; both trigger haptic vibration motors

## Backend expectations

Your backend should expose:
- `POST /api/update-location` expects JSON `{ "lat": number, "lng": number }`
- `POST /api/update-steps` expects JSON `{ "steps": number }`
- `POST /api/fall-detected` expects JSON `{ "fell": boolean }`

All requests include header `X-Device-ID: <DEVICE_ID>` matching a known device (e.g., `aneesh_bhaiyya`).

If you use your deployed URL (HTTPS), the sketches set the TLS client to insecure for testing. Prefer local HTTP during development.

## Setup

1. Open the `.ino` you want to run in the Arduino IDE or PlatformIO.
2. Edit `esp32/config.h`:
   - `WIFI_SSID`, `WIFI_PASS`
   - `API_BASE` – `http://<your-pc-ip>:3000` for local, or your deployed URL.
   - `DEVICE_ID` – must exist on backend.
3. Select board ESP32 Dev Module, correct COM port.
4. Upload.

## Pins

- Button: `PUSH_BUTTON_PIN` (default GPIO 14) uses `INPUT_PULLUP`; connect button between pin and GND.
- Vibration motors: `VIBE_LEFT_PIN` (GPIO 25) and `VIBE_RIGHT_PIN` (GPIO 26) via suitable driver (e.g., transistor/MOSFET + diode). Do NOT drive motors directly from GPIO.
- Lidar/Water analog pins (optional). If not wired, the code simulates triggers randomly.

## Troubleshooting

- If requests fail on HTTPS, try switching `API_BASE` to your local `http://<ip>:3000` while testing.
- Ensure your backend is reachable from the ESP32's WiFi network.
- Check Serial Monitor at 115200 baud for logs.
- Frontend alerts panel should show fall alerts within a few seconds after a fall POST.
