/**
 * Validates migration files are timestamp-named and in correct order.
 * Run: npm run db:validate
 */
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const TIMESTAMP_PATTERN = /^(\d{14})_[a-z0-9_]+\.sql$/;

function main() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("No migration files found.");
    process.exit(1);
  }

  let prevTimestamp = "";
  const errors: string[] = [];

  for (const file of files) {
    const match = file.match(TIMESTAMP_PATTERN);
    if (!match) {
      errors.push(`Invalid name (use YYYYMMDDHHMMSS_name.sql): ${file}`);
      continue;
    }

    const ts = match[1];
    if (prevTimestamp && ts <= prevTimestamp) {
      errors.push(`Out of order: ${file} (${ts}) must be after ${prevTimestamp}`);
    }
    prevTimestamp = ts;
  }

  const manifestPath = path.join(MIGRATIONS_DIR, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Array<{
      file: string;
      version: string;
    }>;
    const manifestFiles = manifest.map((m) => m.file).sort();
    const missingInManifest = files.filter((f) => !manifestFiles.includes(f));
    const missingOnDisk = manifestFiles.filter((f) => !files.includes(f));

    if (missingInManifest.length) {
      errors.push(`SQL files missing from manifest.json: ${missingInManifest.join(", ")}`);
    }
    if (missingOnDisk.length) {
      errors.push(`Manifest entries missing on disk: ${missingOnDisk.join(", ")}`);
    }
  }

  if (errors.length) {
    console.error("Migration validation failed:\n");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`OK: ${files.length} migrations in correct sequence`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}

main();
