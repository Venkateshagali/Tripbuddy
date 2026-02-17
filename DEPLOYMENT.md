# Deployment Guide (Vercel + Render/Railway)

## 1) Backend deploy (Render)
- Create a new **Web Service** from this repo.
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Set env vars in Render:
- `PORT=5000`
- `JWT_SECRET=<strong-secret>`
- `FRONTEND_URL=<your-vercel-url>`
- `CORS_ORIGIN=<your-vercel-url>`
- `DB_HOST=<mysql-host>`
- `DB_PORT=<mysql-port>`
- `DB_USER=<mysql-user>`
- `DB_PASSWORD=<mysql-password>`
- `DB_NAME=<mysql-db-name>`

## 2) Frontend deploy (Vercel)
- Import this repo in Vercel.
- Framework preset: `Vite`
- Root directory: `client`

Set env vars in Vercel:
- `VITE_API_BASE_URL=<your-render-or-railway-backend-url>`
- `VITE_FIREBASE_API_KEY=...`
- `VITE_FIREBASE_AUTH_DOMAIN=...`
- `VITE_FIREBASE_PROJECT_ID=...`
- `VITE_FIREBASE_STORAGE_BUCKET=...`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
- `VITE_FIREBASE_APP_ID=...`
- `VITE_FIREBASE_MEASUREMENT_ID=...`

## 3) Final CORS step
After Vercel gives final domain:
- Update backend `FRONTEND_URL` and `CORS_ORIGIN` to that exact domain.

## 4) Seed data (optional)
Do **not** run `npm run seed` on production unless you want to reset data.
