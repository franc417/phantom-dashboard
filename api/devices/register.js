import pg from 'pg';
const { Client } = pg;
import crypto from 'crypto';
import { verifySession, getBearerToken } from '../../lib/auth.js';

// POST /api/devices/register
// Header: Authorization: Bearer <session token from /api/login or /api/register>
// Body: { device_name }
// Generates a unique device_id + device_secret, tied to whichever account
// is logged in. The Responder app calls this once during onboarding, then
// stores both locally and uses device_secret on every future /api/ping.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  const session = token ? verifySession(token) : null;
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { device_name } = req.body || {};

  const deviceId = 'PH-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const deviceSecret = crypto.randomBytes(32).toString('hex');

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(
      'INSERT INTO devices (user_id, device_id, device_name, device_secret) VALUES ($1, $2, $3, $4)',
      [session.userId, deviceId, device_name || null, deviceSecret]
    );
    return res.status(200).json({ device_id: deviceId, device_secret: deviceSecret });
  } catch (err) {
    console.error('device register failed', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    await client.end();
  }
}
