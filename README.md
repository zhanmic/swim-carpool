# Swim Carpool

Mobile-first web app for swim team families to coordinate practice drop-offs and pick-ups. Share one private link; each parent picks their family name once on their phone.

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Database** — create a [Neon](https://neon.tech) or Vercel Postgres database and copy the connection string.

   ```bash
   cp .env.example .env.local
   # Edit .env.local and set POSTGRES_URL
   ```

3. **Initialize schema**

   ```bash
   npm run db:init
   ```

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), go to **Create a team**, add family names, and share the `/c/{slug}` link with your group.

## Add to Home Screen (iPhone)

1. Open your team link in **Safari** (not Chrome).
2. Tap the **Share** button.
3. Tap **Add to Home Screen**.
4. Name it "Swim Carpool" and tap **Add**.

The app opens full-screen with safe-area padding for the notch and home indicator. Your selected family is remembered on that device.

## Deploy on Vercel

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Add environment variable `POSTGRES_URL` (Vercel Postgres or Neon connection string).
3. Deploy, then run `npm run db:init` locally against production `POSTGRES_URL`, or use the Vercel CLI / SQL console to run `sql/schema.sql`.
4. Visit your deployment, create a team at `/setup`, and share the carpool link.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:init` | Apply database schema |

## Tech stack

- Next.js 16, React, Tailwind CSS
- Neon serverless Postgres (`POSTGRES_URL`)
- SWR for 15s polling updates
