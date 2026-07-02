import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import { addDays, formatDateOnly, getWeekDates, parseDateOnly } from "./dates";
import type {
  Assignment,
  AssignmentRole,
  CreateTeamTemplate,
  Family,
  PracticeSession,
  SessionUpdate,
  SessionWithAssignments,
  Team,
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
  const schemaPath = join(process.cwd(), "sql", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

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
  const rows = await sql`SELECT id, name, secret_slug FROM teams WHERE secret_slug = ${slug} LIMIT 1`;
  return (rows[0] as Team | undefined) ?? null;
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

type TemplateRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  location_name: string;
  cancelled: boolean;
};

export async function ensureWeekSessions(teamId: string, weekStartDate: string): Promise<void> {
  const sql = getSql();
  const weekStart = parseDateOnly(weekStartDate);
  const dates = getWeekDates(weekStart);

  const templates = (await sql`
    SELECT day_of_week, start_time::text, end_time::text, location_name, cancelled
    FROM recurring_templates
    WHERE team_id = ${teamId}
  `) as TemplateRow[];

  const templateByDay = new Map(templates.map((t) => [t.day_of_week, t]));

  for (let i = 0; i < 7; i++) {
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
    const startTime = normalizeTime(tmpl?.start_time?.slice(0, 5) ?? "16:00");
    const endTime = normalizeTime(tmpl?.end_time?.slice(0, 5) ?? "18:00");
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
      ps.location_notes,
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

  await ensureWeekSessions(team.id, weekStartStr);

  const weekStart = parseDateOnly(weekStartStr);
  const weekEnd = formatDateOnly(addDays(weekStart, 6));

  const [families, sessions] = await Promise.all([
    getFamilies(team.id),
    getSessionsWithAssignments(team.id, weekStartStr, weekEnd),
  ]);

  return { team, families, sessions, weekStart: weekStartStr };
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
      location_notes = COALESCE(${data.location_notes ?? null}, location_notes),
      cancelled = COALESCE(${data.cancelled ?? null}, cancelled)
    WHERE id = ${id}
    RETURNING
      id,
      team_id,
      session_date::text AS session_date,
      start_time::text AS start_time,
      end_time::text AS end_time,
      location_name,
      location_notes,
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
    RETURNING id, name, secret_slug
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
          ${normalizeTime(t.start_time ?? "16:00")},
          ${normalizeTime(t.end_time ?? "18:00")},
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
    for (let day = 0; day < 7; day++) {
      await sql`
        INSERT INTO recurring_templates (team_id, day_of_week, start_time, end_time, location_name)
        VALUES (${team.id}, ${day}, '16:00', '18:00', 'Main Pool')
        ON CONFLICT (team_id, day_of_week) DO NOTHING
      `;
    }
  }

  return { team, families };
}
