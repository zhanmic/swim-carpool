# Swim Carpool

Mobile-first web app for swim team families to coordinate practice drop-offs and pick-ups. Share one private link; each parent picks their family name once on their phone.

## Features

### Week View
- **Weekly schedule** with color-coded family assignments
- **Quick navigation** between weeks with Prev/Next buttons
- **Family switcher dropdown** - select your family as driver from top-right menu
- **Theme toggle** - switch between light and dark mode
- **Print schedule** - printer-friendly tabular view with all week details
- **Share team link** - easily share the team URL with other families

### Day Management
- **Tap any day** to view/edit details in a bottom sheet
- **Assign drivers** for drop-off and pick-up (tap "Open" or family name)
- **Mark absences** - tap family names to toggle skipping
- **Home pickups** - specify custom pickup times at family homes
- **Location & time** - edit practice location and time
- **Cancel sessions** - mark practices as cancelled with visual indicators
- **Location notes** - add details like parking instructions or court numbers

### AI Agent Assistant
- **Natural language commands** - speak or type requests like "Make Smith family drive Monday"
- **Smart scheduling** - assign drivers, mark absences, update times/locations
- **Color-coded summaries** - family names highlighted in their team colors
- **Action history** - see what the agent changed in each response
- **iPhone voice input** - use native voice typing for hands-free control

### Team Settings
- **Manage families** - add/remove families with custom colors
- **Home locations** - set pickup addresses with Google Places integration
- **Official schedule link** - add external calendar URL
- **Visible days** - configure which days of the week show in schedule
- **Location management** - add/edit practice locations with map links
- **Team renaming** - update team name anytime
- **Schedule source** - optionally connect a Commit Swimming team to auto-fill weekly practices by group

### Mobile-First Design
- **iPhone-optimized** - designed for one-screen-no-scroll layouts
- **PWA support** - install as home screen app with safe areas
- **Touch targets** - 44px primary actions, 40px compact controls
- **Bottom sheets** - modal UI that slides up from bottom
- **Dark mode** - full support with system preference detection
- **Responsive** - works on phones, tablets, and desktop

### Data & Privacy
- **Local family selection** - your driver selection saved on device only
- **Real-time updates** - 15-second polling keeps everyone in sync
- **Team isolation** - each team has unique slug, no cross-team access
- **No authentication** - simple link sharing, no login required

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
2. Tap the **Share** button (square with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Name it "Swim Carpool" and tap **Add**.

The app opens full-screen with safe-area padding for the notch and home indicator. Your selected family is remembered on that device.

### First Time Setup

1. Visit your deployment at the root URL
2. Tap **Create a team** (or go to `/setup`)
3. Enter team name and add family names
4. Share the generated `/c/{slug}` link with your group
5. Each family member opens the link and selects their family from the dropdown

## Usage

### Weekly Schedule
- **View current week** - see all practices with driver assignments
- **Navigate weeks** - use ‹ Prev / Next › buttons
- **Switch family** - tap family button (top right) to pick your role
- **Print schedule** - tap printer icon for printable view
- **Share link** - tap share icon to send team URL

### Managing a Day
1. **Tap any practice day** to open details
2. **Assign drop-off driver** - tap "Open" or current driver name
3. **Assign pick-up driver** - tap "Open" or current driver name
4. **Mark absences** - tap family names in "Skipping" section
5. **Add home pickups** - set custom times for pickup at homes
6. **Edit location** - tap location to change or add notes
7. **Change time** - tap time to update start/end
8. **Cancel practice** - toggle cancel switch (shows red on schedule)

### Using the AI Agent
1. **Tap the AI icon** (animated sparkles in speech bubble)
2. **Type or speak** your request, like:
   - "Make Johnson family drive Tuesday"
   - "Mark Smith as skipping Wednesday"
   - "Change Thursday practice to 4pm"
   - "Assign dropoff to Garcia and pickup to Lee on Friday"
3. **Review changes** - see color-coded summary of what changed
4. **Close when done** - tap X or swipe down

### Team Settings
1. **Tap team name** at top to open settings
2. **Add families** - enter name and optional home address
3. **Edit locations** - manage practice venues
4. **Set schedule link** - add external calendar URL
5. **Configure days** - choose which weekdays appear
6. **Rename team** - update team name

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
| `npm run db:migrate` | Run database migrations |

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Database**: Neon serverless Postgres or Vercel Postgres
- **Real-time**: SWR with 15-second polling
- **AI**: OpenAI GPT-4 for natural language agent
- **Maps**: Google Places API for address autocomplete
- **Deployment**: Vercel (recommended)
- **PWA**: Mobile-optimized with safe area support

## API Endpoints

### Teams
- `GET /api/teams` - List all teams
- `GET /api/teams/[slug]` - Get team details
- `POST /api/teams` - Create new team
- `PATCH /api/teams/[slug]` - Update team settings
- `DELETE /api/teams/[slug]` - Delete team

### Families
- `GET /api/teams/[slug]/families` - List families
- `POST /api/teams/[slug]/families` - Add family
- `PATCH /api/teams/[slug]/families/[id]` - Update family
- `DELETE /api/teams/[slug]/families/[id]` - Remove family

### Sessions (Practices)
- `GET /api/teams/[slug]/week` - Get week view data
- `GET /api/teams/[slug]/sessions/[date]` - Get single session
- `POST /api/teams/[slug]/week/batch` - Bulk create sessions
- `PATCH /api/sessions/[id]` - Update session
- `DELETE /api/sessions/[id]` - Delete session

### Assignments (Drivers)
- `GET /api/assignments` - List assignments (filtered by session/family)
- `POST /api/assignments` - Create assignment
- `DELETE /api/assignments` - Remove assignment

### Absences
- `GET /api/absences` - List absences (filtered by session/family)
- `POST /api/absences` - Mark absence
- `DELETE /api/absences` - Remove absence

### Locations
- `GET /api/teams/[slug]/locations` - List team locations
- `POST /api/teams/[slug]/locations` - Add location
- `PATCH /api/teams/[slug]/locations/[id]` - Update location
- `DELETE /api/teams/[slug]/locations/[id]` - Remove location

### AI Agent
- `POST /api/teams/[slug]/agent` - Send agent command
- `POST /api/teams/[slug]/agent?turn_id=X&confirm=true` - Confirm agent action

### Schedule Import (Commit Swimming)
Optionally fill a week's practices from a club's [Commit Swimming](https://www.commitswimming.com) public calendar. Configured per team under **Team settings → Schedule source** (Super Team ID, timezone, group, and title-parsing rules), then imported per week from the **Import** button in the week view.

- `GET /api/teams/[slug]/commit/groups` - List detected training groups (accepts `superTeamId`, `timezone`, `mode`, `separator`, `fields` query overrides to preview an unsaved config)
- `GET /api/teams/[slug]/commit/preview?week_start=YYYY-MM-DD` - Preview the per-day import plan (no writes)
- `POST /api/teams/[slug]/commit/import` - Apply the plan to the week's sessions (`{ week_start, group? }`); driver assignments, skips, and home pickups are preserved

> Data comes from the public `utility.commitswimming.com` website API, which is undocumented and may change. Responses are cached server-side. Each team stores its own `superTeamId` and parsing rules, so any Commit-based club can connect.

### Utilities
- `GET /api/places/search?input=query` - Google Places autocomplete
- `GET /api/openapi.json` - OpenAPI schema for AI agent

## Environment Variables

```bash
# Required
POSTGRES_URL=postgresql://user:pass@host/db

# Optional (for AI agent)
OPENAI_API_KEY=sk-...

# Optional (for address autocomplete)
GOOGLE_PLACES_API_KEY=AIza...
```

## Database Schema

### Tables
- `teams` - Team configurations
- `families` - Family profiles per team
- `sessions` - Practice sessions
- `assignments` - Driver assignments (drop-off/pick-up)
- `absences` - Family absence tracking
- `locations` - Practice venue definitions

See `sql/schema.sql` for full schema definition.

## Contributing

This is an MVP built for personal use. Feel free to fork and adapt for your team's needs.

## License

MIT
