import { neon } from "@neondatabase/serverless";

const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL or DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(url);

const rows = await sql`DELETE FROM teams RETURNING id`;
console.log(`Deleted ${rows.length} team(s).`);
