import jwt from 'jsonwebtoken';

// Every logged-in request (from either app, or the website once it's
// migrated) carries this token as `Authorization: Bearer <token>`.
// Set JWT_SECRET as a Vercel environment variable — generate one the same
// way DEVICE_SECRET was generated: `openssl rand -hex 32`.

const JWT_SECRET = process.env.JWT_SECRET;

export function signSession(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function getBearerToken(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
