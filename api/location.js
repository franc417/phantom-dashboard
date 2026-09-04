import { createClient } from '@vercel/postgres';

// The dashboard calls this to read location data:
//
//   GET /api/location?device_id=PHANTOM-01BA4719C80B&history=50
//
// No separate secret needed here — this whole path is already behind the
// Basic Auth login enforced by middleware.js, so if the request reached
// this handler the browser has already authenticated.
//
// Response `latest` is shaped like the old location.json so the existing
// processLocation() logic in index.html didn't need to change.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const deviceId = req.query.device_id;
  if (!deviceId) {
    return res.status(400).json({ error: 'device_id is required' });
  }

  const historyLimit = Math.min(parseInt(req.query.history || '0', 10) || 0, 500);
  const client = createClient({ connectionString: process.env.POSTGRES_URL });

  try {
    await client.connect();

    const latestResult = await client.sql`
      SELECT * FROM pings
      WHERE device_id = ${deviceId}
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    if (latestResult.rows.length === 0) {
      return res.status(404).json({ error: 'No pings yet for this device' });
    }

    const row = latestResult.rows[0];
    const latest = {
      device_id: row.device_id,
      device_name: row.device_name,
      device_model: row.device_model,
      device_brand: row.device_brand,
      android_ver: row.android_ver,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy,
      provider: row.provider,
      battery_pct: row.battery_pct,
      battery_status: row.battery_status,
      wifi_ssid: row.wifi_ssid,
      wifi_ip: row.wifi_ip,
      wifi_rssi: row.wifi_rssi,
      timestamp: row.client_ts || row.recorded_at,
      updated_utc: row.recorded_at,
    };

    let history = [];
    if (historyLimit > 0) {
      const historyResult = await client.sql`
        SELECT latitude, longitude, recorded_at, battery_pct
        FROM pings
        WHERE device_id = ${deviceId}
        ORDER BY recorded_at DESC
        LIMIT ${historyLimit}
      `;
      history = historyResult.rows;
    }

    return res.status(200).json({ ...latest, history });
  } catch (err) {
    console.error('location query failed', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    await client.end();
  }
}
