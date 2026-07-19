export type AssignmentRole = "dropoff" | "pickup";

export interface Team {
  id: string;
  name: string;
  secret_slug: string;
  schedule_url: string | null;
  visible_days: number[];
  has_delete_password: boolean;
  has_api_key: boolean;
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
}

export interface CreateTeamTemplate {
  day_of_week: number;
  start_time?: string;
  end_time?: string;
  location_name?: string;
  cancelled?: boolean;
}
