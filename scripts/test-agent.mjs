#!/usr/bin/env node
/**
 * Tests Phase 1 + Phase 2 schedule capabilities and agent endpoint.
 *
 * Usage:
 *   node scripts/test-agent.mjs
 *   BASE=https://swim-carpool.vercel.app node scripts/test-agent.mjs
 *   BASE=http://localhost:3000 GEMINI_API_KEY=... node scripts/test-agent.mjs
 */

const BASE = process.env.BASE ?? "https://swim-carpool.vercel.app";
const SLUG = process.env.SLUG ?? "test-0u17th";
const WEEK_START = process.env.WEEK_START ?? "2026-07-05";
const SESSION_DATE = process.env.SESSION_DATE ?? "2026-07-10";
const AGENT_DELAY_MS = Number(process.env.AGENT_DELAY_MS ?? 8000);

let pass = 0;
let fail = 0;
let skip = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`PASS: ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail += 1;
    console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function skipCheck(name, reason) {
  skip += 1;
  console.log(`SKIP: ${name} — ${reason}`);
}

async function json(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function agentPost(body, label) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const result = await json("POST", `/api/teams/${SLUG}/agent`, body);
    const rateLimited =
      result.res.status === 502 &&
      String(result.data.error ?? "").toLowerCase().includes("rate limit");
    if (!rateLimited || attempt === 4) return result;
    console.log(`  … rate limited on ${label}, waiting ${AGENT_DELAY_MS * attempt}ms`);
    await sleep(AGENT_DELAY_MS * attempt);
  }
  throw new Error("agentPost retry exhausted");
}

async function getSession() {
  const { res, data } = await json("GET", `/api/teams/${SLUG}/sessions/${SESSION_DATE}`);
  return { res, session: data.session };
}

async function testPhase1ScheduleApi() {
  console.log("\n=== Phase 1 — schedule API backing ===");

  let { res, session } = await getSession();
  check("GET session", res.ok, SESSION_DATE);

  ({ res } = await json("PATCH", `/api/teams/${SLUG}/sessions/${SESSION_DATE}`, {
    location_notes: "agent phase1 test",
  }));
  check("PATCH notes", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/sessions/${SESSION_DATE}/assignments`, {
    family_name: "Emily",
    role: "dropoff",
    action: "claim",
  }));
  check("claim dropoff", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/sessions/${SESSION_DATE}/assignments`, {
    family_name: "Emma",
    role: "pickup",
    action: "claim",
  }));
  check("claim pickup", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/sessions/${SESSION_DATE}/absences`, {
    family_name: "Ria",
    action: "mark",
  }));
  check("mark skip", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/sessions/${SESSION_DATE}/absences`, {
    family_name: "Ria",
    action: "clear",
  }));
  check("clear skip", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/sessions/${SESSION_DATE}/pickups/default`));
  check("default home pickups", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/week/assignments`, {
    action: "clear",
    weekStart: WEEK_START,
  }));
  check("clear week", res.ok);

  ({ session } = await getSession());
  check(
    "week clear wiped data",
    session &&
      session.assignments.length === 0 &&
      !session.location_notes &&
      Object.keys(session.dropoff_pickups ?? {}).length === 0
  );
}

async function testPhase2ScheduleApi() {
  console.log("\n=== Phase 2 — schedule API backing ===");

  const emilyId = (
    await json("GET", `/api/teams/${SLUG}/families`)
  ).data.families?.find((f) => f.name === "Emily")?.id;

  let { res } = await json("POST", `/api/teams/${SLUG}/sessions/${SESSION_DATE}/assignments`, {
    family_name: "Emily",
    role: "pickup",
    action: "claim",
  });
  check("claim pickup for unclaim test", res.ok);

  if (emilyId) {
    ({ res } = await json("POST", `/api/teams/${SLUG}/sessions/${SESSION_DATE}/assignments`, {
      family_id: emilyId,
      role: "pickup",
      action: "unclaim",
    }));
    check("unclaim pickup", res.ok);
  } else {
    skipCheck("unclaim pickup", "Emily family id missing");
  }

  ({ res } = await json("PATCH", `/api/teams/${SLUG}/sessions/${SESSION_DATE}`, {
    dropoff_pickups: { Emma: "07:00" },
  }));
  check("set home pickup", res.ok);

  ({ res } = await json("PATCH", `/api/teams/${SLUG}/sessions/${SESSION_DATE}`, {
    start_time: "05:45",
    end_time: "06:45",
    cancelled: true,
  }));
  check("cancel session", res.ok);

  ({ res } = await json("PATCH", `/api/teams/${SLUG}/sessions/${SESSION_DATE}`, {
    cancelled: false,
  }));
  check("uncancel session", res.ok);

  ({ res } = await json("PATCH", `/api/teams/${SLUG}/sessions/${SESSION_DATE}`, {
    location_name: "BCHS",
  }));
  check("set session location", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/week/time`, {
    weekStart: WEEK_START,
    start_time: "05:45",
    end_time: "06:45",
  }));
  check("set week time", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/week/location`, {
    weekStart: WEEK_START,
    locationName: "BCHS",
  }));
  check("set week location", res.ok);

  ({ res } = await json("POST", `/api/teams/${SLUG}/week/assignments`, {
    action: "clear",
    weekStart: WEEK_START,
  }));
  check("cleanup clear week", res.ok);
}

async function testAgentEndpoint() {
  console.log("\n=== Agent endpoint (Gemini) ===");

  const probe = await agentPost(
    { message: "Who is drop-off driver on Friday July 10 2026?", week_start: WEEK_START },
    "probe"
  );

  if (probe.res.status === 404) {
    skipCheck("agent route", "not deployed on this BASE yet");
    return;
  }

  if (probe.res.status === 503) {
    skipCheck("agent Gemini tests", "GEMINI_API_KEY not set on server");
    return;
  }

  if (!probe.res.ok) {
    check("agent probe", false, JSON.stringify(probe.data));
    return;
  }

  check("agent probe read-only", probe.res.ok, probe.data.reply?.slice(0, 80));

  await sleep(AGENT_DELAY_MS);
  const phase1 = await agentPost(
    { message: "Emily is drop-off driver on Friday July 10 2026", week_start: WEEK_START },
    "claim dropoff"
  );
  check("phase1 claim via agent", phase1.res.ok && phase1.data.week_mutated, phase1.data.reply);

  let session = (await getSession()).session;
  const emilyDrop = session?.assignments?.find((a) => a.role === "dropoff" && a.family_name === "Emily");
  check("phase1 Emily dropoff applied", !!emilyDrop);

  await sleep(AGENT_DELAY_MS);
  const phase2a = await agentPost(
    { message: "Set Emma home pickup to 7:00 on Friday July 10 2026", week_start: WEEK_START },
    "home pickup"
  );
  check("phase2 home pickup via agent", phase2a.res.ok && phase2a.data.week_mutated, phase2a.data.reply);

  await sleep(AGENT_DELAY_MS);
  const phase2b = await agentPost(
    { message: "Cancel practice on Friday July 10 2026", week_start: WEEK_START },
    "cancel"
  );
  check("phase2 cancel via agent", phase2b.res.ok && phase2b.data.week_mutated, phase2b.data.reply);

  session = (await getSession()).session;
  check("phase2 session cancelled", session?.cancelled === true);

  await sleep(AGENT_DELAY_MS);
  const phase2c = await agentPost(
    { message: "Restore practice on Friday July 10 2026", week_start: WEEK_START },
    "uncancel"
  );
  check("phase2 uncancel via agent", phase2c.res.ok, phase2c.data.reply);

  await sleep(AGENT_DELAY_MS);
  const destructive = await agentPost(
    { message: "Clear the whole week", week_start: WEEK_START },
    "clear week"
  );
  check(
    "destructive asks confirm",
    destructive.res.ok && !!destructive.data.proposed_plan?.token,
    destructive.data.proposed_plan?.summary
  );

  if (destructive.data.proposed_plan?.token) {
    const confirmed = await json("POST", `/api/teams/${SLUG}/agent`, {
      week_start: WEEK_START,
      confirm: { token: destructive.data.proposed_plan.token, approved: true },
    });
    check("destructive confirm runs", confirmed.res.ok && confirmed.data.week_mutated, confirmed.data.reply);

    session = (await getSession()).session;
    check("destructive cleared friday", session?.assignments?.length === 0);
  }

  await json("POST", `/api/teams/${SLUG}/week/location`, {
    weekStart: WEEK_START,
    locationName: "BCHS",
  });
  await json("PATCH", `/api/teams/${SLUG}/sessions/${SESSION_DATE}`, {
    cancelled: false,
    start_time: "05:45",
    end_time: "06:45",
  });
}

async function main() {
  console.log(`Testing ${BASE} team=${SLUG} week=${WEEK_START}`);
  await testPhase1ScheduleApi();
  await testPhase2ScheduleApi();
  await testAgentEndpoint();
  console.log(`\n=== Results: ${pass} passed, ${fail} failed, ${skip} skipped ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
