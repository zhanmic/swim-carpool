import { neon } from "@neondatabase/serverless";
import { addDays, formatDateOnly, getWeekStart, parseDateOnly, snapTimeToStep, weekStartForDate } from "./dates";
import { parseDropoffPickups } from "./dropoffPickups";
import { getSchemaStatements } from "./schema";
import {
  DEFAULT_EXISTING_TEAM_DELETE_PASSWORD,
  hashTeamPassword,
  verifyTeamPassword,
} from "./teamPassword";
import { generateTeamApiKey, hashTeamApiKey } from "./apiKey";
import { parseScheduleIntegration } from "./commit/config";
import {
  DEFAULT_VISIBLE_DAYS,
  getWeekEndForVisibleDays,
  getVisibleWeekDates,
  migrateVisibleDaysFromMondayStart,
  normalizeVisibleDays,
  parseVisibleDays,
  visibleSessionDates,
} from "./visibleDays";
import type {
  Assignment,
  AssignmentRole,
  Family,
  PracticeSession,
  SessionAbsence,
  ScheduleIntegration,
  SessionUpdate,
  SessionWithAssignments,
  Team,
  SavedLocation,
  WeekData,
} from "./types";

function getSql() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("POSTGRES_URL or DATABASE_URL is not set");
  }
  return neon(url);
}

export async function ensureSchema(): Promise<void> {
  const sql = getSql();
  const statements = getSchemaStatements();

  for (const statement of statements) {
    await sql.query(statement);
  }

  await migrateVisibleDaysToSundayWeekStart();
  await migrateTeamDeletePasswords();
  await migrateTeamApiKeys();
}

async function migrateVisibleDaysToSundayWeekStart(): Promise<void> {
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const done = await sql`SELECT value FROM app_meta WHERE key = 'visible_days_sunday_week' LIMIT 1`;
  if (done.length > 0) return;

  const teams = await sql`SELECT id, visible_days FROM teams`;
  for (const row of teams as { id: string; visible_days: unknown }[]) {
    const days = parseVisibleDays(row.visible_days);
    const migrated = migrateVisibleDaysFromMondayStart(days);
    await sql`
      UPDATE teams
      SET visible_days = ${JSON.stringify(migrated)}::jsonb
      WHERE id = ${row.id}
    `;
  }

  await sql`
    INSERT INTO app_meta (key, value)
    VALUES ('visible_days_sunday_week', '1')
    ON CONFLICT (key) DO NOTHING
  `;
}

async function migrateTeamDeletePasswords(): Promise<void> {
  const sql = getSql();
  const done = await sql`SELECT value FROM app_meta WHERE key = 'team_delete_password_backfill' LIMIT 1`;
  if (done.length > 0) return;

  const hash = hashTeamPassword(DEFAULT_EXISTING_TEAM_DELETE_PASSWORD);
  await sql`
    UPDATE teams
    SET delete_password_hash = ${hash}
    WHERE delete_password_hash IS NULL
  `;

  await sql`
    INSERT INTO app_meta (key, value)
    VALUES ('team_delete_password_backfill', '1')
    ON CONFLICT (key) DO NOTHING
  `;
}

async function migrateTeamApiKeys(): Promise<void> {
  const sql = getSql();
  const done = await sql`SELECT value FROM app_meta WHERE key = 'team_api_key_backfill' LIMIT 1`;
  if (done.length > 0) return;

  const teams = await sql`SELECT id FROM teams WHERE api_key_hash IS NULL`;
  for (const row of teams as { id: string }[]) {
    const apiKey = generateTeamApiKey();
    await sql`
      UPDATE teams SET api_key_hash = ${hashTeamApiKey(apiKey)} WHERE id = ${row.id}
    `;
  }

  await sql`
    INSERT INTO app_meta (key, value)
    VALUES ('team_api_key_backfill', '1')
    ON CONFLICT (key) DO NOTHING
  `;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "team"}-${suffix}`;
}

function normalizeTime(t: string): string {
  const snapped = snapTimeToStep(t.slice(0, 5));
  return `${snapped}:00`;
}

type TeamRow = Team & {
  visible_days?: unknown;
  delete_password_hash?: string | null;
  api_key_hash?: string | null;
  schedule_integration?: unknown;
};

function mapTeamRow(row: TeamRow): Team {
  const { delete_password_hash, api_key_hash, schedule_integration, ...rest } = row;
  return {
    ...rest,
    visible_days: parseVisibleDays(row.visible_days),
    has_delete_password: !!delete_password_hash,
    has_api_key: !!api_key_hash,
    schedule_integration: parseScheduleIntegration(schedule_integration),
  };
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, secret_slug, schedule_url, visible_days, delete_password_hash, api_key_hash, schedule_integration, created_at::text AS created_at
    FROM teams WHERE secret_slug = ${slug} LIMIT 1
  `;
  const row = rows[0] as TeamRow | undefined;
  return row ? mapTeamRow(row) : null;
}

export async function listTeams(): Promise<Team[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, secret_slug, schedule_url, visible_days, delete_password_hash, api_key_hash, schedule_integration, created_at::text AS created_at
    FROM teams
    ORDER BY name
  `;
  return (rows as TeamRow[]).map(mapTeamRow);
}

export async function getTeamApiKeyHash(slug: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT api_key_hash FROM teams WHERE secret_slug = ${slug} LIMIT 1
  `;
  const row = rows[0] as { api_key_hash: string | null } | undefined;
  return row?.api_key_hash ?? null;
}

export async function updateTeam(
  slug: string,
  data: {
    name: string;
    schedule_url?: string | null;
    visible_days?: number[];
    delete_password?: string;
    schedule_integration?: ScheduleIntegration | null;
  }
): Promise<Team | null> {
  const trimmed = data.name.trim();
  if (!trimmed) return null;
  const scheduleUrl = data.schedule_url?.trim() || null;
  const visibleDaysJson =
    data.visible_days !== undefined ? JSON.stringify(normalizeVisibleDays(data.visible_days)) : null;
  const passwordHash =
    data.delete_password !== undefined
      ? data.delete_password.trim()
        ? hashTeamPassword(data.delete_password.trim())
        : null
      : undefined;
  const integrationJson =
    data.schedule_integration !== undefined
      ? data.schedule_integration
        ? JSON.stringify(data.schedule_integration)
        : null
      : undefined;
  const sql = getSql();
  const rows = await sql`
    UPDATE teams
    SET
      name = ${trimmed},
      schedule_url = ${scheduleUrl},
      visible_days = COALESCE(${visibleDaysJson}::jsonb, visible_days),
      delete_password_hash = CASE
        WHEN ${data.delete_password !== undefined} THEN ${passwordHash ?? null}
        ELSE delete_password_hash
      END,
      schedule_integration = CASE
        WHEN ${data.schedule_integration !== undefined} THEN ${integrationJson ?? null}::jsonb
        ELSE schedule_integration
      END
    WHERE secret_slug = ${slug}
    RETURNING id, name, secret_slug, schedule_url, visible_days, delete_password_hash, api_key_hash, schedule_integration, created_at::text AS created_at
  `;
  const row = rows[0] as TeamRow | undefined;
  if (!row) return null;
  const team = mapTeamRow(row);
  if (data.visible_days !== undefined) {
    await ensureRecurringTemplatesForDays(team.id, team.visible_days);
  }
  return team;
}

export async function verifyTeamDeletePassword(slug: string, password: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    SELECT delete_password_hash FROM teams WHERE secret_slug = ${slug} LIMIT 1
  `;
  const row = rows[0] as { delete_password_hash: string | null } | undefined;
  if (!row) return false;
  return verifyTeamPassword(password, row.delete_password_hash);
}

export async function deleteTeamBySlug(slug: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM teams WHERE secret_slug = ${slug} RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteAllTeams(): Promise<number> {
  const sql = getSql();
  const rows = await sql`DELETE FROM teams RETURNING id`;
  return rows.length;
}

export async function getFamilies(teamId: string): Promise<Family[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, team_id, name, home_label
    FROM families
    WHERE team_id = ${teamId}
    ORDER BY name
  `;
  return rows as Family[];
}

export async function addFamily(teamId: string, name: string): Promise<{ family: Family | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { family: null, error: "Family name is required" };

  const sql = getSql();
  const existing = await sql`
    SELECT id FROM families WHERE team_id = ${teamId} AND name = ${trimmed} LIMIT 1
  `;
  if (existing.length > 0) {
    return { family: null, error: "A family with that name already exists" };
  }

  const rows = await sql`
    INSERT INTO families (team_id, name)
    VALUES (${teamId}, ${trimmed})
    RETURNING id, team_id, name, home_label
  `;
  return { family: (rows[0] as Family | undefined) ?? null };
}

export async function updateFamily(
  teamId: string,
  familyId: string,
  name: string
): Promise<{ family: Family | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { family: null, error: "Family name is required" };

  const sql = getSql();
  const duplicate = await sql`
    SELECT id FROM families
    WHERE team_id = ${teamId} AND name = ${trimmed} AND id != ${familyId}
    LIMIT 1
  `;
  if (duplicate.length > 0) {
    return { family: null, error: "A family with that name already exists" };
  }

  const rows = await sql`
    UPDATE families
    SET name = ${trimmed}
    WHERE id = ${familyId} AND team_id = ${teamId}
    RETURNING id, team_id, name, home_label
  `;
  if (!rows.length) {
    return { family: null, error: "Family not found" };
  }
  return { family: rows[0] as Family };
}

export async function deleteFamily(
  teamId: string,
  familyId: string
): Promise<{ ok: boolean; error?: string }> {
  const families = await getFamilies(teamId);
  if (families.length <= 1) {
    return { ok: false, error: "Cannot remove the last family" };
  }

  const sql = getSql();
  const rows = await sql`
    DELETE FROM families WHERE id = ${familyId} AND team_id = ${teamId} RETURNING id
  `;
  if (!rows.length) {
    return { ok: false, error: "Family not found" };
  }

  return { ok: true };
}

export async function getSavedLocations(teamId: string): Promise<SavedLocation[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, team_id, name, address, sort_order
    FROM saved_locations
    WHERE team_id = ${teamId}
    ORDER BY sort_order, name
  `;
  return rows as SavedLocation[];
}

export async function ensureSavedLocations(teamId: string): Promise<void> {
  const sql = getSql();
  const existing = await sql`
    SELECT id FROM saved_locations WHERE team_id = ${teamId} LIMIT 1
  `;
  if (existing.length > 0) return;

  await sql`
    INSERT INTO saved_locations (team_id, name, sort_order)
    VALUES (${teamId}, 'Main Pool', 0)
    ON CONFLICT (team_id, name) DO NOTHING
  `;

  const fromTemplates = await sql`
    SELECT DISTINCT location_name FROM recurring_templates
    WHERE team_id = ${teamId} AND location_name <> 'Main Pool'
  `;
  let order = 1;
  for (const row of fromTemplates as { location_name: string }[]) {
    await sql`
      INSERT INTO saved_locations (team_id, name, sort_order)
      VALUES (${teamId}, ${row.location_name}, ${order})
      ON CONFLICT (team_id, name) DO NOTHING
    `;
    order++;
  }
}

export async function addSavedLocation(
  teamId: string,
  name: string,
  address?: string | null
): Promise<SavedLocation | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const sql = getSql();
  const maxOrder = await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM saved_locations WHERE team_id = ${teamId}
  `;
  const sortOrder = (maxOrder[0] as { next_order: number }).next_order;
  const rows = await sql`
    INSERT INTO saved_locations (team_id, name, address, sort_order)
    VALUES (${teamId}, ${trimmed}, ${address ?? null}, ${sortOrder})
    ON CONFLICT (team_id, name) DO UPDATE SET
      address = COALESCE(EXCLUDED.address, saved_locations.address)
    RETURNING id, team_id, name, address, sort_order
  `;
  return (rows[0] as SavedLocation | undefined) ?? null;
}

export async function updateSavedLocation(
  teamId: string,
  locationId: string,
  name: string,
  address?: string | null
): Promise<SavedLocation | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const sql = getSql();
  const rows = await sql`
    UPDATE saved_locations
    SET name = ${trimmed}, address = ${address ?? null}
    WHERE id = ${locationId} AND team_id = ${teamId}
    RETURNING id, team_id, name, address, sort_order
  `;
  return (rows[0] as SavedLocation | undefined) ?? null;
}

export async function deleteSavedLocation(teamId: string, locationId: string): Promise<boolean> {
  const sql = getSql();
  const count = await sql`
    SELECT COUNT(*)::int AS n FROM saved_locations WHERE team_id = ${teamId}
  `;
  if ((count[0] as { n: number }).n <= 1) return false;

  const result = await sql`
    DELETE FROM saved_locations
    WHERE id = ${locationId} AND team_id = ${teamId}
    RETURNING id
  `;
  return result.length > 0;
}

type TemplateRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  location_name: string;
  cancelled: boolean;
  no_practice: boolean;
};

export async function ensureRecurringTemplatesForDays(teamId: string, visibleDays: number[]): Promise<void> {
  const sql = getSql();
  const sourceRows = await sql`
    SELECT start_time::text, end_time::text, location_name, cancelled, COALESCE(no_practice, FALSE) AS no_practice
    FROM recurring_templates
    WHERE team_id = ${teamId}
    ORDER BY day_of_week
    LIMIT 1
  `;
  const source = sourceRows[0] as
    | { start_time: string; end_time: string; location_name: string; cancelled: boolean; no_practice: boolean }
    | undefined;
  const startTime = normalizeTime(source?.start_time?.slice(0, 5) ?? "05:45");
  const endTime = normalizeTime(source?.end_time?.slice(0, 5) ?? "08:15");
  const locationName = source?.location_name ?? "Main Pool";
  const cancelled = source?.cancelled ?? false;
  const noPractice = source?.no_practice ?? false;

  for (const day of visibleDays) {
    await sql`
      INSERT INTO recurring_templates (team_id, day_of_week, start_time, end_time, location_name, cancelled, no_practice)
      VALUES (${teamId}, ${day}, ${startTime}, ${endTime}, ${locationName}, ${cancelled}, ${noPractice})
      ON CONFLICT (team_id, day_of_week) DO NOTHING
    `;
  }
}

export async function ensureWeekSessions(
  teamId: string,
  weekStartDate: string,
  earliestWeekStart?: string,
  visibleDays: number[] = [...DEFAULT_VISIBLE_DAYS]
): Promise<void> {
  if (earliestWeekStart && weekStartDate < earliestWeekStart) {
    return;
  }
  const sql = getSql();
  const weekStart = parseDateOnly(weekStartDate);
  const dates = getVisibleWeekDates(weekStart, visibleDays);

  const templates = (await sql`
    SELECT day_of_week, start_time::text, end_time::text, location_name, cancelled, COALESCE(no_practice, FALSE) AS no_practice
    FROM recurring_templates
    WHERE team_id = ${teamId}
  `) as TemplateRow[];

  const templateByDay = new Map(templates.map((t) => [t.day_of_week, t]));

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dateStr = formatDateOnly(date);
    const jsDay = date.getDay();
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

    const existing = await sql`
      SELECT id FROM practice_sessions
      WHERE team_id = ${teamId} AND session_date = ${dateStr}
      LIMIT 1
    `;
    if (existing.length > 0) continue;

    const tmpl = templateByDay.get(dayOfWeek);
    const startTime = normalizeTime(tmpl?.start_time?.slice(0, 5) ?? "05:45");
    const endTime = normalizeTime(tmpl?.end_time?.slice(0, 5) ?? "08:15");
    const locationName = tmpl?.location_name ?? "Main Pool";
    const cancelled = tmpl?.cancelled ?? false;
    const noPractice = tmpl?.no_practice ?? false;

    await sql`
      INSERT INTO practice_sessions (team_id, session_date, start_time, end_time, location_name, cancelled, no_practice)
      VALUES (${teamId}, ${dateStr}, ${startTime}, ${endTime}, ${locationName}, ${cancelled}, ${noPractice})
    `;
  }
}

async function getSessionsWithAssignments(teamId: string, weekStart: string, weekEnd: string): Promise<SessionWithAssignments[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      ps.id,
      ps.team_id,
      ps.session_date::text AS session_date,
      ps.start_time::text AS start_time,
      ps.end_time::text AS end_time,
      ps.location_name,
      ps.location_notes,
      ps.dropoff_pickups,
      ps.cancelled,
      COALESCE(ps.no_practice, FALSE) AS no_practice,
      COALESCE(
        json_agg(
          json_build_object(
            'id', a.id,
            'session_id', a.session_id,
            'family_id', a.family_id,
            'role', a.role,
            'family_name', f.name
          )
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'::json
      ) AS assignments,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'family_id', sa.family_id,
              'family_name', af.name
            )
            ORDER BY af.name
          )
          FROM session_absences sa
          JOIN families af ON af.id = sa.family_id
          WHERE sa.session_id = ps.id
        ),
        '[]'::json
      ) AS absences
    FROM practice_sessions ps
    LEFT JOIN assignments a ON a.session_id = ps.id
    LEFT JOIN families f ON f.id = a.family_id
    WHERE ps.team_id = ${teamId}
      AND ps.session_date >= ${weekStart}
      AND ps.session_date <= ${weekEnd}
    GROUP BY ps.id
    ORDER BY ps.session_date
  `;

  return (rows as Array<SessionWithAssignments & { assignments: Assignment[] | string; absences: SessionAbsence[] | string; dropoff_pickups?: unknown }>).map((row) => ({
    ...row,
    start_time: row.start_time.slice(0, 5),
    end_time: row.end_time.slice(0, 5),
    dropoff_pickups: parseDropoffPickups(row.dropoff_pickups),
    assignments: typeof row.assignments === "string" ? JSON.parse(row.assignments) : row.assignments ?? [],
    absences: typeof row.absences === "string" ? JSON.parse(row.absences) : row.absences ?? [],
  }));
}

export async function getWeekData(slug: string, weekStartStr: string): Promise<WeekData | null> {
  const team = await getTeamBySlug(slug);
  if (!team) return null;

  const earliestWeekStart = weekStartForDate(team.created_at);
  const effectiveWeekStart =
    weekStartStr < earliestWeekStart ? earliestWeekStart : weekStartStr;

  const visibleDays = parseVisibleDays(team.visible_days);

  await ensureWeekSessions(team.id, effectiveWeekStart, earliestWeekStart, visibleDays);
  await ensureSavedLocations(team.id);

  const weekStart = parseDateOnly(effectiveWeekStart);
  const weekEnd = formatDateOnly(getWeekEndForVisibleDays(weekStart, visibleDays));
  const visibleDates = new Set(visibleSessionDates(effectiveWeekStart, visibleDays));

  const [families, sessions, locations] = await Promise.all([
    getFamilies(team.id),
    getSessionsWithAssignments(team.id, effectiveWeekStart, weekEnd),
    getSavedLocations(team.id),
  ]);

  return {
    team,
    families,
    sessions: sessions.filter((session) => visibleDates.has(session.session_date)),
    locations,
    weekStart: effectiveWeekStart,
    earliestWeekStart,
  };
}

export async function getSessionByDateForTeam(
  teamId: string,
  sessionDate: string,
  teamCreatedAt: string,
  visibleDays: number[] = [...DEFAULT_VISIBLE_DAYS]
): Promise<SessionWithAssignments | null> {
  const earliestWeekStart = weekStartForDate(teamCreatedAt);
  const weekStart = formatDateOnly(getWeekStart(parseDateOnly(sessionDate)));
  await ensureWeekSessions(teamId, weekStart, earliestWeekStart, visibleDays);
  const sessions = await getSessionsWithAssignments(teamId, sessionDate, sessionDate);
  return sessions[0] ?? null;
}

export async function sessionBelongsToTeam(sessionId: string, teamId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM practice_sessions WHERE id = ${sessionId} AND team_id = ${teamId} LIMIT 1
  `;
  return rows.length > 0;
}

export async function applyCancelledToDates(
  teamId: string,
  dates: string[],
  cancelled: boolean
): Promise<number> {
  if (dates.length === 0) return 0;
  const sql = getSql();
  const rows = await sql`
    UPDATE practice_sessions
    SET cancelled = ${cancelled}
    WHERE team_id = ${teamId}
      AND session_date = ANY(${dates})
    RETURNING id
  `;
  return rows.length;
}

export async function applyNoPracticeToDates(
  teamId: string,
  dates: string[],
  noPractice: boolean
): Promise<number> {
  if (dates.length === 0) return 0;
  const sql = getSql();
  const rows = await sql`
    UPDATE practice_sessions
    SET no_practice = ${noPractice}
    WHERE team_id = ${teamId}
      AND session_date = ANY(${dates})
    RETURNING id
  `;
  return rows.length;
}

export async function applyNotesToDates(
  teamId: string,
  dates: string[],
  locationNotes: string | null
): Promise<number> {
  if (dates.length === 0) return 0;
  const sql = getSql();
  const notes = locationNotes?.trim() || null;
  const rows = await sql`
    UPDATE practice_sessions
    SET location_notes = ${notes}
    WHERE team_id = ${teamId}
      AND session_date = ANY(${dates})
    RETURNING id
  `;
  return rows.length;
}

export async function claimAssignment(sessionId: string, familyId: string, role: AssignmentRole): Promise<{ ok: boolean; error?: string }> {
  const sql = getSql();

  const existing = await sql`
    SELECT id, family_id FROM assignments
    WHERE session_id = ${sessionId} AND role = ${role}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const row = existing[0] as { id: string; family_id: string };
    if (row.family_id === familyId) {
      return { ok: true };
    }
    return { ok: false, error: "Slot already claimed by another family" };
  }

  await sql`
    INSERT INTO assignments (session_id, family_id, role)
    VALUES (${sessionId}, ${familyId}, ${role})
  `;
  return { ok: true };
}

export async function releaseAssignment(sessionId: string, role: AssignmentRole): Promise<{ ok: boolean; error?: string }> {
  const sql = getSql();
  const result = await sql`
    DELETE FROM assignments
    WHERE session_id = ${sessionId} AND role = ${role}
    RETURNING id
  `;
  if (result.length === 0) {
    return { ok: false, error: "Slot is already open" };
  }
  return { ok: true };
}

export async function unclaimAssignment(sessionId: string, familyId: string, role: AssignmentRole): Promise<{ ok: boolean; error?: string }> {
  const sql = getSql();
  const result = await sql`
    DELETE FROM assignments
    WHERE session_id = ${sessionId}
      AND family_id = ${familyId}
      AND role = ${role}
    RETURNING id
  `;
  if (result.length === 0) {
    return { ok: false, error: "Assignment not found or not yours" };
  }
  return { ok: true };
}

export async function markAbsence(sessionId: string, familyId: string): Promise<{ ok: boolean; error?: string }> {
  const sql = getSql();

  await sql`
    INSERT INTO session_absences (session_id, family_id)
    VALUES (${sessionId}, ${familyId})
    ON CONFLICT DO NOTHING
  `;

  await sql`
    DELETE FROM assignments
    WHERE session_id = ${sessionId} AND family_id = ${familyId}
  `;

  const sessionRows = await sql`
    SELECT dropoff_pickups FROM practice_sessions WHERE id = ${sessionId} LIMIT 1
  `;
  if (sessionRows.length > 0) {
    const pickups = parseDropoffPickups((sessionRows[0] as { dropoff_pickups: unknown }).dropoff_pickups);
    if (pickups[familyId]) {
      delete pickups[familyId];
      await sql`
        UPDATE practice_sessions
        SET dropoff_pickups = ${JSON.stringify(pickups)}::jsonb
        WHERE id = ${sessionId}
      `;
    }
  }

  return { ok: true };
}

export async function clearAbsence(sessionId: string, familyId: string): Promise<{ ok: boolean; error?: string }> {
  const sql = getSql();
  await sql`
    DELETE FROM session_absences
    WHERE session_id = ${sessionId} AND family_id = ${familyId}
  `;
  return { ok: true };
}

export async function updateSession(id: string, data: SessionUpdate): Promise<PracticeSession | null> {
  const sql = getSql();
  const dropoffPickups =
    data.dropoff_pickups !== undefined ? JSON.stringify(data.dropoff_pickups) : null;
  const rows = await sql`
    UPDATE practice_sessions
    SET
      start_time = COALESCE(${data.start_time ? normalizeTime(data.start_time) : null}, start_time),
      end_time = COALESCE(${data.end_time ? normalizeTime(data.end_time) : null}, end_time),
      location_name = COALESCE(${data.location_name ?? null}, location_name),
      location_notes = CASE WHEN ${data.location_notes !== undefined} THEN ${data.location_notes?.trim() || null} ELSE location_notes END,
      dropoff_pickups = CASE WHEN ${data.dropoff_pickups !== undefined} THEN ${dropoffPickups}::jsonb ELSE dropoff_pickups END,
      cancelled = COALESCE(${data.cancelled ?? null}, cancelled),
      no_practice = COALESCE(${data.no_practice ?? null}, no_practice)
    WHERE id = ${id}
    RETURNING
      id,
      team_id,
      session_date::text AS session_date,
      start_time::text AS start_time,
      end_time::text AS end_time,
      location_name,
      location_notes,
      dropoff_pickups,
      cancelled,
      COALESCE(no_practice, FALSE) AS no_practice
  `;

  const row = rows[0] as (PracticeSession & { dropoff_pickups?: unknown }) | undefined;
  if (!row) return null;
  return {
    ...row,
    start_time: row.start_time.slice(0, 5),
    end_time: row.end_time.slice(0, 5),
    dropoff_pickups: parseDropoffPickups(row.dropoff_pickups),
  };
}

export async function applyLocationToWeek(
  teamId: string,
  weekStartStr: string,
  locationName: string,
  visibleDays: number[] = [...DEFAULT_VISIBLE_DAYS]
): Promise<number> {
  const trimmed = locationName.trim();
  if (!trimmed) return 0;

  const dates = visibleSessionDates(weekStartStr, visibleDays);
  if (dates.length === 0) return 0;

  const sql = getSql();
  const rows = await sql`
    UPDATE practice_sessions
    SET location_name = ${trimmed}
    WHERE team_id = ${teamId}
      AND session_date = ANY(${dates})
    RETURNING id
  `;
  return rows.length;
}

export async function applyTimeToWeek(
  teamId: string,
  weekStartStr: string,
  startTime: string,
  endTime: string,
  visibleDays: number[] = [...DEFAULT_VISIBLE_DAYS]
): Promise<number> {
  const dates = visibleSessionDates(weekStartStr, visibleDays);
  if (dates.length === 0) return 0;

  const sql = getSql();
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);

  const rows = await sql`
    UPDATE practice_sessions
    SET start_time = ${start}, end_time = ${end}
    WHERE team_id = ${teamId}
      AND session_date = ANY(${dates})
    RETURNING id
  `;

  for (const day of visibleDays) {
    await sql`
      UPDATE recurring_templates
      SET start_time = ${start}, end_time = ${end}
      WHERE team_id = ${teamId} AND day_of_week = ${day}
    `;
  }

  return rows.length;
}

export async function clearWeekAssignments(
  teamId: string,
  weekStartStr: string,
  visibleDays: number[] = [...DEFAULT_VISIBLE_DAYS],
  options?: { notesAndPickups?: boolean }
): Promise<number> {
  const dates = visibleSessionDates(weekStartStr, visibleDays);
  if (dates.length === 0) return 0;

  const sql = getSql();
  const rows = await sql`
    DELETE FROM assignments a
    USING practice_sessions ps
    WHERE a.session_id = ps.id
      AND ps.team_id = ${teamId}
      AND ps.session_date = ANY(${dates})
    RETURNING a.id
  `;

  if (options?.notesAndPickups) {
    await sql`
      DELETE FROM session_absences sa
      USING practice_sessions ps
      WHERE sa.session_id = ps.id
        AND ps.team_id = ${teamId}
        AND ps.session_date = ANY(${dates})
    `;

    await sql`
      UPDATE practice_sessions
      SET location_notes = NULL, dropoff_pickups = '{}'::jsonb
      WHERE team_id = ${teamId}
        AND session_date = ANY(${dates})
    `;
  }

  return rows.length;
}

export async function copyScheduleFromPreviousWeek(
  teamId: string,
  weekStartStr: string,
  visibleDays: number[] = [...DEFAULT_VISIBLE_DAYS]
): Promise<{ copied: number; cleared: number }> {
  const sql = getSql();
  const teamRows = await sql`
    SELECT created_at::text AS created_at FROM teams WHERE id = ${teamId} LIMIT 1
  `;
  const earliestWeekStart = weekStartForDate((teamRows[0] as { created_at: string }).created_at);
  const normalizedWeekStart = formatDateOnly(getWeekStart(parseDateOnly(weekStartStr)));
  const prevStart = formatDateOnly(addDays(parseDateOnly(normalizedWeekStart), -7));

  await ensureWeekSessions(teamId, normalizedWeekStart, earliestWeekStart, visibleDays);

  const cleared = await clearWeekAssignments(teamId, normalizedWeekStart, visibleDays);

  if (prevStart < earliestWeekStart) {
    return { copied: 0, cleared };
  }

  await ensureWeekSessions(teamId, prevStart, earliestWeekStart, visibleDays);

  const dates = visibleSessionDates(normalizedWeekStart, visibleDays);
  if (dates.length === 0) {
    return { copied: 0, cleared };
  }

  const rows = await sql`
    UPDATE practice_sessions AS curr
    SET
      location_name = prev.location_name,
      start_time = prev.start_time,
      end_time = prev.end_time,
      cancelled = prev.cancelled
    FROM practice_sessions AS prev
    WHERE curr.team_id = ${teamId}
      AND prev.team_id = ${teamId}
      AND curr.session_date = ANY(${dates})
      AND prev.session_date = curr.session_date - 7
    RETURNING curr.id
  `;

  return { copied: rows.length, cleared };
}

export async function createTeam(
  name: string,
  familyNames: string[],
  schedule: {
    location_name: string;
    location_address?: string | null;
    start_time: string;
    end_time: string;
  },
  options?: { delete_password?: string | null }
): Promise<{ team: Team; families: Family[]; api_key: string }> {
  const sql = getSql();
  const slug = slugify(name);
  const locationName = schedule.location_name.trim();
  const startTime = normalizeTime(schedule.start_time);
  const endTime = normalizeTime(schedule.end_time);
  const passwordHash = options?.delete_password?.trim()
    ? hashTeamPassword(options.delete_password.trim())
    : null;
  const apiKey = generateTeamApiKey();
  const apiKeyHash = hashTeamApiKey(apiKey);

  const teamRows = await sql`
    INSERT INTO teams (name, secret_slug, delete_password_hash, api_key_hash)
    VALUES (${name}, ${slug}, ${passwordHash}, ${apiKeyHash})
    RETURNING id, name, secret_slug, schedule_url, visible_days, delete_password_hash, api_key_hash, schedule_integration, created_at::text AS created_at
  `;
  const team = mapTeamRow(teamRows[0] as TeamRow);

  const families: Family[] = [];
  for (const familyName of familyNames) {
    const trimmed = familyName.trim();
    if (!trimmed) continue;
    const rows = await sql`
      INSERT INTO families (team_id, name)
      VALUES (${team.id}, ${trimmed})
      RETURNING id, team_id, name, home_label
    `;
    families.push(rows[0] as Family);
  }

  for (let day = 0; day < 6; day++) {
    await sql`
      INSERT INTO recurring_templates (team_id, day_of_week, start_time, end_time, location_name)
      VALUES (${team.id}, ${day}, ${startTime}, ${endTime}, ${locationName})
      ON CONFLICT (team_id, day_of_week) DO UPDATE SET
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        location_name = EXCLUDED.location_name
    `;
  }

  await sql`
    INSERT INTO saved_locations (team_id, name, address, sort_order)
    VALUES (${team.id}, ${locationName}, ${schedule.location_address ?? null}, 0)
    ON CONFLICT (team_id, name) DO UPDATE SET
      address = COALESCE(EXCLUDED.address, saved_locations.address)
  `;

  return { team, families, api_key: apiKey };
}
