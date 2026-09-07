import pg from 'pg';
const { Client } = pg;
import bcrypt from 'bcryptjs';
import { signSession } from '../lib/auth.js';

// POST /api/register
// Body: { username, password }
// Called once, on first launch of either app (or the website), when
// someone creates an account. Returns a session token the app stores
// locally and sends as `Authorization: Bearer <token>` from then on.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const existing = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username.trim(), passwordHash]
    );
    const user = result.rows[0];
    const token = signSession({ userId: user.id, username: user.username });
    return res.status(200).json({ token, username: user.username });
  } catch (err) {
    console.error('register failed', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    await client.end();
  }
}
