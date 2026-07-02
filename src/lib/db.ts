import { neon } from "@neondatabase/serverless";
import { addDays, formatDateOnly, getMonday, getWeekDates, getWeekEnd, parseDateOnly, weekStartForDate } from "./dates";
import { getSchemaStatements } from "./schema";
import type {
  Assignment,
  AssignmentRole,
  CreateTeamTemplate,
  Family,
  PracticeSession,
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
  return t.length === 5 ? `${t}:00` : t;
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const sql = getSql();
  const rows = await sql`SELECT id, name, secret_slug, created_at::text AS created_at FROM teams WHERE secret_slug = ${slug} LIMIT 1`;
  return (rows[0] as Team | undefined) ?? null;
}

export async function listTeams(): Promise<Team[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, secret_slug
    FROM teams
    ORDER BY name
  `;
  return rows as Team[];
}

export async function updateTeamName(slug: string, name: string): Promise<Team | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const sql = getSql();
  const rows = await sql`
    UPDATE teams
    SET name = ${trimmed}
    WHERE secret_slug = ${slug}
    RETURNING id, name, secret_slug
  `;
  return (rows[0] as Team | undefined) ?? null;
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
};

export async function ensureWeekSessions(
  teamId: string,
  weekStartDate: string,
  earliestWeekStart?: string
): Promise<void> {
  if (earliestWeekStart && weekStartDate < earliestWeekStart) {
    return;
  }
  const sql = getSql();
  const weekStart = parseDateOnly(weekStartDate);
  const dates = getWeekDates(weekStart);

  const templates = (await sql`
    SELECT day_of_week, start_time::text, end_time::text, location_name, cancelled
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

    await sql`
      INSERT INTO practice_sessions (team_id, session_date, start_time, end_time, location_name, cancelled)
      VALUES (${teamId}, ${dateStr}, ${startTime}, ${endTime}, ${locationName}, ${cancelled})
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
      ps.cancelled,
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
      ) AS assignments
    FROM practice_sessions ps
    LEFT JOIN assignments a ON a.session_id = ps.id
    LEFT JOIN families f ON f.id = a.family_id
    WHERE ps.team_id = ${teamId}
      AND ps.session_date >= ${weekStart}
      AND ps.session_date <= ${weekEnd}
    GROUP BY ps.id
    ORDER BY ps.session_date
  `;

  return (rows as Array<SessionWithAssignments & { assignments: Assignment[] | string }>).map((row) => ({
    ...row,
    start_time: row.start_time.slice(0, 5),
    end_time: row.end_time.slice(0, 5),
    assignments: typeof row.assignments === "string" ? JSON.parse(row.assignments) : row.assignments ?? [],
  }));
}

export async function getWeekData(slug: string, weekStartStr: string): Promise<WeekData | null> {
  const team = await getTeamBySlug(slug);
  if (!team) return null;

  const earliestWeekStart = weekStartForDate(team.created_at);
  const effectiveWeekStart =
    weekStartStr < earliestWeekStart ? earliestWeekStart : weekStartStr;

  await ensureWeekSessions(team.id, effectiveWeekStart, earliestWeekStart);
  await ensureSavedLocations(team.id);

  const weekStart = parseDateOnly(effectiveWeekStart);
  const weekEnd = formatDateOnly(getWeekEnd(weekStart));

  const [families, sessions, locations] = await Promise.all([
    getFamilies(team.id),
    getSessionsWithAssignments(team.id, effectiveWeekStart, weekEnd),
    getSavedLocations(team.id),
  ]);

  return {
    team,
    families,
    sessions,
    locations,
    weekStart: effectiveWeekStart,
    earliestWeekStart,
  };
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

export async function updateSession(id: string, data: SessionUpdate): Promise<PracticeSession | null> {
  const sql = getSql();
  const rows = await sql`
    UPDATE practice_sessions
    SET
      start_time = COALESCE(${data.start_time ? normalizeTime(data.start_time) : null}, start_time),
      end_time = COALESCE(${data.end_time ? normalizeTime(data.end_time) : null}, end_time),
      location_name = COALESCE(${data.location_name ?? null}, location_name),
      cancelled = COALESCE(${data.cancelled ?? null}, cancelled)
    WHERE id = ${id}
    RETURNING
      id,
      team_id,
      session_date::text AS session_date,
      start_time::text AS start_time,
      end_time::text AS end_time,
      location_name,
      cancelled
  `;

  const row = rows[0] as PracticeSession | undefined;
  if (!row) return null;
  return {
    ...row,
    start_time: row.start_time.slice(0, 5),
    end_time: row.end_time.slice(0, 5),
  };
}

export async function applyLocationToWeek(
  teamId: string,
  weekStartStr: string,
  locationName: string
): Promise<number> {
  const trimmed = locationName.trim();
  if (!trimmed) return 0;

  const sql = getSql();
  const weekEnd = formatDateOnly(getWeekEnd(parseDateOnly(weekStartStr)));
  const rows = await sql`
    UPDATE practice_sessions
    SET location_name = ${trimmed}
    WHERE team_id = ${teamId}
      AND session_date >= ${weekStartStr}
      AND session_date <= ${weekEnd}
    RETURNING id
  `;
  return rows.length;
}

export async function applyTimeToWeek(
  teamId: string,
  weekStartStr: string,
  startTime: string,
  endTime: string
): Promise<number> {
  const sql = getSql();
  const weekEnd = formatDateOnly(getWeekEnd(parseDateOnly(weekStartStr)));
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);

  const rows = await sql`
    UPDATE practice_sessions
    SET start_time = ${start}, end_time = ${end}
    WHERE team_id = ${teamId}
      AND session_date >= ${weekStartStr}
      AND session_date <= ${weekEnd}
    RETURNING id
  `;

  for (let day = 0; day < 6; day++) {
    await sql`
      UPDATE recurring_templates
      SET start_time = ${start}, end_time = ${end}
      WHERE team_id = ${teamId} AND day_of_week = ${day}
    `;
  }

  return rows.length;
}

export async function clearWeekAssignments(teamId: string, weekStartStr: string): Promise<number> {
  const sql = getSql();
  const weekEnd = formatDateOnly(getWeekEnd(parseDateOnly(weekStartStr)));
  const rows = await sql`
    DELETE FROM assignments a
    USING practice_sessions ps
    WHERE a.session_id = ps.id
      AND ps.team_id = ${teamId}
      AND ps.session_date >= ${weekStartStr}
      AND ps.session_date <= ${weekEnd}
    RETURNING a.id
  `;
  return rows.length;
}

export async function copyScheduleFromPreviousWeek(
  teamId: string,
  weekStartStr: string
): Promise<{ copied: number; cleared: number }> {
  const sql = getSql();
  const teamRows = await sql`
    SELECT created_at::text AS created_at FROM teams WHERE id = ${teamId} LIMIT 1
  `;
  const earliestWeekStart = weekStartForDate((teamRows[0] as { created_at: string }).created_at);
  const normalizedWeekStart = formatDateOnly(getMonday(parseDateOnly(weekStartStr)));
  const prevStart = formatDateOnly(addDays(parseDateOnly(normalizedWeekStart), -7));

  await ensureWeekSessions(teamId, normalizedWeekStart, earliestWeekStart);

  const cleared = await clearWeekAssignments(teamId, normalizedWeekStart);

  if (prevStart < earliestWeekStart) {
    return { copied: 0, cleared };
  }

  await ensureWeekSessions(teamId, prevStart, earliestWeekStart);

  const weekEnd = formatDateOnly(getWeekEnd(parseDateOnly(normalizedWeekStart)));
  const prevEnd = formatDateOnly(getWeekEnd(parseDateOnly(prevStart)));

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
      AND curr.session_date >= ${normalizedWeekStart}
      AND curr.session_date <= ${weekEnd}
      AND prev.session_date >= ${prevStart}
      AND prev.session_date <= ${prevEnd}
      AND prev.session_date = curr.session_date - 7
    RETURNING curr.id
  `;

  return { copied: rows.length, cleared };
}

export async function createTeam(
  name: string,
  familyNames: string[],
  templates?: CreateTeamTemplate[]
): Promise<{ team: Team; families: Family[] }> {
  const sql = getSql();
  const slug = slugify(name);

  const teamRows = await sql`
    INSERT INTO teams (name, secret_slug)
    VALUES (${name}, ${slug})
    RETURNING id, name, secret_slug, created_at::text AS created_at
  `;
  const team = teamRows[0] as Team;

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

  if (templates && templates.length > 0) {
    for (const t of templates) {
      await sql`
        INSERT INTO recurring_templates (team_id, day_of_week, start_time, end_time, location_name, cancelled)
        VALUES (
          ${team.id},
          ${t.day_of_week},
          ${normalizeTime(t.start_time ?? "05:45")},
          ${normalizeTime(t.end_time ?? "08:15")},
          ${t.location_name ?? "Main Pool"},
          ${t.cancelled ?? false}
        )
        ON CONFLICT (team_id, day_of_week) DO UPDATE SET
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          location_name = EXCLUDED.location_name,
          cancelled = EXCLUDED.cancelled
      `;
    }
  } else {
    for (let day = 0; day < 6; day++) {
      await sql`
        INSERT INTO recurring_templates (team_id, day_of_week, start_time, end_time, location_name)
        VALUES (${team.id}, ${day}, '05:45', '08:15', 'Main Pool')
        ON CONFLICT (team_id, day_of_week) DO NOTHING
      `;
    }
  }

  await sql`
    INSERT INTO saved_locations (team_id, name, sort_order)
    VALUES (${team.id}, 'Main Pool', 0)
    ON CONFLICT (team_id, name) DO NOTHING
  `;

  return { team, families };
}
