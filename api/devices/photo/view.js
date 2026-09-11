import pg from 'pg';
const { Client } = pg;

// GET /api/devices/photo/view?id=...
//
// Deliberately no auth required — this is the link tapped directly from
// an SMS reply. Protected by the photo id being a long random string
// instead of a login.

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

  let imageData;
  try {
    await client.connect();
    const result = await client.query('SELECT image_data FROM photos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      await client.end();
      return res.status(404).send('Not found');
    }
    imageData = result.rows[0].image_data;
  } catch (err) {
    console.error('photo view db query failed', err);
    try { await client.end(); } catch (e) {}
    return res.status(500).send('Server error');
  }

  // Close the DB connection BEFORE writing the binary response, so DB
  // teardown can never race with the response stream actually flushing.
  try {
    await client.end();
  } catch (e) {
  }

  if (!imageData) {
    console.error('photo row found but image_data is empty', { id });
    return res.status(500).send('Photo data missing');
  }

  const buffer = Buffer.from(imageData, 'base64');
  console.log('serving photo', { id, base64Length: imageData.length, bufferLength: buffer.length });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'no-store');
  res.end(buffer);
}
