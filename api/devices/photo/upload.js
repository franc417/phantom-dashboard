import pg from 'pg';
const { Client } = pg;
import crypto from 'crypto';

// POST /api/devices/photo/upload
// Header: x-device-secret: <device's own secret>
// Body: { device_id, image_data }  // image_data = base64-encoded JPEG
//
// Authenticated the same way as /api/ping: the device's own secret,
// checked against either the legacy global DEVICE_SECRET or this
// specific device's row in the devices table.
//
// Returns a photo id and a view URL. The id is a long random string —
// unguessable in practice — so the view endpoint can stay link-
// accessible (no login) for a quick tap from the SMS reply, without
// being enumerable by a stranger.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const deviceSecret = req.headers['x-device-secret'];
  const body = req.body || {};
  const { device_id, image_data } = body;

  if (!deviceSecret || !device_id || !image_data) {
    return res.status(400).json({ error: 'device_id, image_data and x-device-secret are required' });
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    let authorized = deviceSecret === process.env.DEVICE_SECRET;
    if (!authorized) {
      const deviceCheck = await client.query(
        'SELECT 1 FROM devices WHERE device_id = $1 AND device_secret = $2',
        [device_id, deviceSecret]
      );
      authorized = deviceCheck.rows.length > 0;
    }
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const photoId = crypto.randomBytes(16).toString('hex');
    await client.query(
      'INSERT INTO photos (id, device_id, image_data) VALUES ($1, $2, $3)',
      [photoId, device_id, image_data]
    );

    const url = `https://phantom-dashboard-pink.vercel.app/api/devices/photo/view?id=${photoId}`;
    return res.status(200).json({ id: photoId, url });
  } catch (err) {
    console.error('photo upload failed', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    await client.end();
  }
}
