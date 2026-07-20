export type AssignmentRole = "dropoff" | "pickup";

/** How a practice title is split into group / location segments. */
export type PracticeParseMode = "fields" | "keywords";

/** Meaning of each segment after splitting a practice title on the separator. */
export type NameField = "group" | "location" | "time" | "ignore";

export interface PracticeNameFormat {
  /** `fields` = split title by separator; `keywords` = scan whole title. */
  mode: PracticeParseMode;
  /** Separator between group / location / time segments (default "-"). */
  separator: string;
  /** Ordered meaning of each segment after splitting. */
  fields: NameField[];
}

/**
 * Per-team external schedule provider config. Stored on the team as JSON so any
 * team can point at its own Commit super team id and title-parsing rules.
 */
export interface ScheduleIntegration {
  provider: "commit";
  /** Commit Swimming super team id (from the club's public website API). */
  superTeamId: string;
  /** IANA timezone used to place occurrences on calendar days (e.g. America/New_York). */
  timezone: string;
  /** Selected group label to import into this team's schedule; null = all practices. */
  group: string | null;
  /** How to parse practice titles into group + location. */
  nameFormat: PracticeNameFormat;
  /** Whether to also fetch Commit meets. */
  includeMeets: boolean;
}

export interface Team {
  id: string;
  name: string;
  secret_slug: string;
  schedule_url: string | null;
  visible_days: number[];
  has_delete_password: boolean;
  has_api_key: boolean;
  schedule_integration: ScheduleIntegration | null;
  created_at: string;
}

export interface Family {
  id: string;
  team_id: string;
  name: string;
  home_label: string | null;
}

export interface RecurringTemplate {
  id: string;
  team_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location_name: string;
  cancelled: boolean;
  no_practice: boolean;
}

export interface SessionAbsence {
  family_id: string;
  family_name?: string;
}

export interface PracticeSession {
  id: string;
  team_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_notes: string | null;
  dropoff_pickups: Record<string, string>;
  cancelled: boolean;
  no_practice: boolean;
}

export interface Assignment {
  id: string;
  session_id: string;
  family_id: string;
  role: AssignmentRole;
  family_name?: string;
}

export interface SessionWithAssignments extends PracticeSession {
  assignments: Assignment[];
  absences: SessionAbsence[];
}

export interface WeekData {
  team: Team;
  families: Family[];
  sessions: SessionWithAssignments[];
  locations: SavedLocation[];
  weekStart: string;
  earliestWeekStart: string;
}

export interface SavedLocation {
  id: string;
  team_id: string;
  name: string;
  address: string | null;
  sort_order: number;
}

export interface PlaceSuggestion {
  name: string;
  address: string;
}

export interface SessionUpdate {
  start_time?: string;
  end_time?: string;
  location_name?: string;
  location_notes?: string | null;
  dropoff_pickups?: Record<string, string>;
  cancelled?: boolean;
  no_practice?: boolean;
}

export interface CreateTeamTemplate {
  day_of_week: number;
  start_time?: string;
  end_time?: string;
  location_name?: string;
  cancelled?: boolean;
  no_practice?: boolean;
}
