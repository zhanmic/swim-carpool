export type AssignmentRole = "dropoff" | "pickup";

export interface Team {
  id: string;
  name: string;
  secret_slug: string;
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

export interface PracticeSession {
  id: string;
  team_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_notes: string | null;
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
}

export interface WeekData {
  team: Team;
  families: Family[];
  sessions: SessionWithAssignments[];
  locations: SavedLocation[];
  weekStart: string;
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
  cancelled?: boolean;
}

export interface CreateTeamTemplate {
  day_of_week: number;
  start_time?: string;
  end_time?: string;
  location_name?: string;
  cancelled?: boolean;
}
