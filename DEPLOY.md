# Deploying phantom-dashboard on Vercel

## 1. Create a Vercel account and import the project
1. Go to vercel.com and sign up (GitHub login is easiest).
2. "Add New" -> "Project" -> import `franc417/phantom-dashboard`.
3. Framework preset: choose "Other" (no build step needed).
4. Don't deploy yet — set the environment variables first (step 3 below).

## 2. Add Vercel Postgres
1. In the project -> "Storage" tab -> "Create Database" -> Postgres.
2. Once created, connect it to this project. Vercel auto-injects
   `POSTGRES_URL` and related env vars — you don't set these by hand.
3. Open the database's "Query" tab and run the contents of `schema.sql`
   once, to create the `pings` table.

## 3. Set environment variables
In Project Settings -> Environment Variables, add:

| Name                 | Value                              | Used by       |
|----------------------|-------------------------------------|---------------|
| `DEVICE_SECRET`      | a long random string you invent     | `api/ping.js` |
| `DASHBOARD_USER`     | whatever username you want to log in with | `middleware.js` |
| `DASHBOARD_PASSWORD` | a strong password                   | `middleware.js` |

Generate a good random secret with, e.g.:
```
openssl rand -hex 32
```

## 4. Deploy
Trigger the deploy (push to the connected branch, or click "Deploy" in
the Vercel dashboard). Vercel will run `npm install` automatically to
pick up the `@vercel/postgres` dependency.

## 5. Test it
```bash
# Simulate a device ping
curl -X POST https://<your-project>.vercel.app/api/ping \
  -H "content-type: application/json" \
  -H "x-device-secret: <DEVICE_SECRET>" \
  -d '{
    "device_id": "PHANTOM-01BA4719C80B",
    "device_name": "Redmi-MKZ",
    "latitude": 0.0353,
    "longitude": 36.3615,
    "accuracy": 5,
    "provider": "gps",
    "battery_pct": 80,
    "battery_status": "DISCHARGING"
  }'
```
Then open `https://<your-project>.vercel.app/` in a browser — it should
prompt for the Basic Auth login (`DASHBOARD_USER` / `DASHBOARD_PASSWORD`),
then show the pinged location on the map.

## 6. Update the device app
Whatever is currently running on the phone and pushing commits to the
`phantom-data` GitHub repo needs to be pointed at
`POST https://<your-project>.vercel.app/api/ping` with the
`x-device-secret` header instead. That code isn't in either of these two
repos — let's track it down or rebuild it next.

## 7. Once everything is verified working
Make both GitHub repos private (`Settings -> General -> Danger Zone ->
Change visibility` in each repo). At that point the `phantom-data` repo
and its `location.json` history are no longer needed at all — the git
commit-per-ping approach can be retired.
