import { sql } from '@vercel/postgres';

// The device app calls this on every location update:
//
//   POST /api/ping
//   Headers: { "x-device-secret": "<DEVICE_SECRET>", "content-type": "application/json" }
//   Body: {
//     device_id, device_name, device_model, device_brand, android_ver,
//     latitude, longitude, accuracy, provider,
//     battery_pct, battery_status, wifi_ssid, wifi_ip, wifi_rssi,
//     timestamp   // device-local time string, optional
//   }
//
// This route is excluded from the Basic Auth in middleware.js so the
// device doesn't need to handle a browser-style login prompt — it only
// needs to know DEVICE_SECRET.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const deviceSecret = req.headers['x-device-secret'];
  if (!deviceSecret || deviceSecret !== process.env.DEVICE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  const {
    device_id, device_name, device_model, device_brand, android_ver,
    latitude, longitude, accuracy, provider,
    battery_pct, battery_status, wifi_ssid, wifi_ip, wifi_rssi,
    timestamp,
  } = body;

  if (!device_id || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'device_id, latitude and longitude are required' });
  }

  try {
    await sql`
      INSERT INTO pings (
        device_id, device_name, device_model, device_brand, android_ver,
        latitude, longitude, accuracy, provider,
        battery_pct, battery_status, wifi_ssid, wifi_ip, wifi_rssi,
        client_ts
      ) VALUES (
        ${device_id}, ${device_name ?? null}, ${device_model ?? null}, ${device_brand ?? null}, ${android_ver ?? null},
        ${latitude}, ${longitude}, ${accuracy ?? null}, ${provider ?? null},
        ${battery_pct ?? null}, ${battery_status ?? null}, ${wifi_ssid ?? null}, ${wifi_ip ?? null}, ${wifi_rssi ?? null},
        ${timestamp ?? null}
      )
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('ping insert failed', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
