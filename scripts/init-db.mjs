import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error("POSTGRES_URL is not set");
  process.exit(1);
}

const schema = readFileSync(join(root, "sql", "schema.sql"), "utf-8");
const sql = neon(url);

try {
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    await sql`${sql.unsafe(statement)}`;
  }
  console.log("Database schema initialized.");
} catch (err) {
  console.error("Failed to initialize schema:", err);
  process.exit(1);
}
