import pg from 'pg';
const { Client } = pg;
import { verifySession, getBearerToken } from '../../lib/auth.js';

// GET /api/devices/list
// Header: Authorization: Bearer <session token>
// Returns only the requesting user's own devices — this is the data
// isolation that makes per-account login meaningful rather than
// decorative.

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

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(
      'SELECT device_id, device_name, created_at FROM devices WHERE user_id = $1 ORDER BY created_at DESC',
      [session.userId]
    );
    return res.status(200).json({ devices: result.rows });
  } catch (err) {
    console.error('device list failed', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    await client.end();
  }
}
