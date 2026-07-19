export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Swim Carpool Schedule API",
    version: "1.0.0",
    description:
      "Programmatic schedule API. The web app continues to use legacy routes unchanged. " +
      "New integrations should use /api/teams/{slug}/... routes. " +
      "Slug-based access works like the share link. Optional Authorization: Bearer <api_key> when a team API key is configured.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/teams/{slug}/week": {
      get: {
        summary: "Load week schedule",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
          { name: "start", in: "query", required: true, schema: { type: "string", format: "date" } },
        ],
      },
    },
    "/api/teams/{slug}/families": {
      get: { summary: "List families (id, name, home_label)" },
    },
    "/api/teams/{slug}/sessions/{date}": {
      get: { summary: "Get one day schedule with assignments and absences" },
      patch: {
        summary: "Update day schedule",
        description:
          "Fields: start_time, end_time, location_name, location_notes, dropoff_pickups (family id or name keys), cancelled, no_practice",
      },
    },
    "/api/teams/{slug}/sessions/{date}/assignments": {
      post: {
        summary: "Claim, release, or unclaim a driver slot",
        description: "Body: family_id or family_name, role (dropoff|pickup), action (claim|release|unclaim)",
      },
    },
    "/api/teams/{slug}/sessions/{date}/absences": {
      post: {
        summary: "Mark or clear a family skip for the day",
        description: "Body: family_id or family_name, action (mark|clear)",
      },
    },
    "/api/teams/{slug}/sessions/{date}/pickups/default": {
      post: { summary: "Set home pickup times to 30 minutes before practice start" },
    },
    "/api/teams/{slug}/week/time": {
      post: { summary: "Set start/end time for all visible days in the week" },
    },
    "/api/teams/{slug}/week/location": {
      post: { summary: "Set location for all visible days in the week" },
    },
    "/api/teams/{slug}/week/assignments": {
      post: {
        summary: "Clear driver slots or copy previous week",
        description:
          "action: clear (drop-off/pick-up slots, notes, home pickup times, and skips) | copy_previous",
      },
    },
    "/api/teams/{slug}/week/batch": {
      post: {
        summary: "Run multiple week operations in one request",
        description:
          "operations: set_time, set_location, clear_assignments, copy_previous_week, set_cancelled, set_no_practice, set_notes, set_pickups_default",
      },
    },
    "/api/teams/{slug}/agent": {
      post: {
        summary: "Natural-language schedule agent (Gemini)",
        description:
          "Body: message + week_start + optional history[], or confirm { token, approved }. Tools: slots, skip, notes, pickups, times, locations, cancel day, no practice day, clear/copy week. Uses GEMINI_API_KEY.",
      },
    },
    "/api/teams/{slug}/locations": {
      get: { summary: "List saved practice locations" },
      post: { summary: "Add, update, or delete saved locations" },
    },
    "/api/places/search": {
      get: { summary: "Search places for location autocomplete", parameters: [{ name: "q", in: "query", required: true }] },
    },
  },
  components: {
    securitySchemes: {
      teamSlug: { type: "apiKey", in: "path", name: "slug" },
      bearerApiKey: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ teamSlug: [] }, { bearerApiKey: [] }],
} as const;
