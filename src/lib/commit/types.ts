export type CommitEventLabel = "practice" | "event" | string;

export interface CommitRecurringCustom {
  id: number;
  removed?: boolean;
  name?: string;
  startTime?: string;
  endTime?: string;
  attachments?: unknown[];
}

export interface CommitRecurring {
  period: "weekdays" | "weekly" | "monthly" | "yearly" | string;
  endDate: string;
  days?: number[];
  custom?: CommitRecurringCustom[];
}

export interface CommitEvent {
  _id: string;
  label: CommitEventLabel;
  name: string;
  startDate: string;
  endDate: string;
  recurring?: CommitRecurring;
  visibleTo?: string;
  superTeamId?: string;
}

export interface CommitMeet {
  _id: string;
  titleEventsFile?: string | null;
  userTitle?: string | null;
  startDateTime: string;
  endDateTime: string;
  locationDetails?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string;
  course?: string;
}

export interface WebsiteData2a {
  superTeam?: {
    _id: string;
    name: string;
    timezone?: string;
  };
  websiteConfig?: unknown;
  settings?: unknown;
}

export interface WebsiteData2b {
  events: CommitEvent[];
  meets?: CommitMeet[];
  programs?: unknown[];
  coachesAndAdmins?: unknown[];
  clubs?: unknown[];
  recordBoards?: unknown[];
}

/**
 * A single concrete calendar occurrence, resolved into the team's timezone so
 * it can be mapped onto a carpool practice_session (date + HH:MM times).
 */
export interface CommitOccurrence {
  /** Stable id for this occurrence (source id + start instant). */
  id: string;
  /** Underlying Commit event/meet id. */
  sourceId: string;
  name: string;
  label: CommitEventLabel | "meet";
  /** Absolute start/end instants. */
  start: Date;
  end: Date;
  /** Calendar day in the team timezone (YYYY-MM-DD). */
  date: string;
  /** Start/end clock times in the team timezone (HH:MM). */
  startTime: string;
  endTime: string;
  /** Parsed group label (e.g. "Sr", "Jr Prep"), or null when unknown. */
  group: string | null;
  /** Parsed location label, or null. */
  location: string | null;
  /** True when the source marked this occurrence cancelled/removed. */
  cancelled: boolean;
}
