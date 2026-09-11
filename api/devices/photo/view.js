import pg from 'pg';
const { Client } = pg;

// GET /api/devices/photo/view?id=...
//
// Deliberately no auth required — this is the link tapped directly from
// an SMS reply. Protected by the photo id being a long random string
// instead of a login, same tradeoff most "shared link" photo/file
// services make for link-tap convenience.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query('SELECT image_data FROM photos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }

    const buffer = Buffer.from(result.rows[0].image_data, 'base64');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('photo view failed', err);
    return res.status(500).send('Server error');
  } finally {
    await client.end();
  }
}
