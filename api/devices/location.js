import pg from 'pg';
const { Client } = pg;
import { verifySession, getBearerToken } from '../../lib/auth.js';

// GET /api/devices/location?device_id=...&history=50
// Header: Authorization: Bearer <session token>
//
// Returns the latest ping for a device — but only if that device actually
// belongs to whoever is logged in. This ownership check is the real
// security boundary: without it, any logged-in user could read any other
// user's device location just by guessing a device_id.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  const session = token ? verifySession(token) : null;
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const deviceId = req.query.device_id;
  if (!deviceId) {
    return res.status(400).json({ error: 'device_id is required' });
  }

  const historyLimit = Math.min(parseInt(req.query.history || '0', 10) || 0, 500);
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const ownership = await client.query(
      'SELECT 1 FROM devices WHERE device_id = $1 AND user_id = $2',
      [deviceId, session.userId]
    );
    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const latestResult = await client.query(
      'SELECT * FROM pings WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT 1',
      [deviceId]
    );

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
      const historyResult = await client.query(
        'SELECT latitude, longitude, recorded_at, battery_pct FROM pings WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT $2',
        [deviceId, historyLimit]
      );
      history = historyResult.rows;
    }

    return res.status(200).json({ ...latest, history });
  } catch (err) {
    console.error('device location query failed', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    await client.end();
  }
}
