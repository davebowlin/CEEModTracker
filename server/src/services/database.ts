import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ModsDatabase } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../../../data/mods-db.json");

const defaultDb: ModsDatabase = {
  lastSyncAtIso: new Date(0).toISOString(),
  itemCount: 0,
  mods: []
};

export async function ensureDatabaseExists(): Promise<void> {
  try {
    await fs.access(dbPath);
  } catch {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(defaultDb, null, 2), "utf8");
  }
}

export async function readDatabase(): Promise<ModsDatabase> {
  await ensureDatabaseExists();
  const content = await fs.readFile(dbPath, "utf8");
  return JSON.parse(content) as ModsDatabase;
}

export async function writeDatabase(data: ModsDatabase): Promise<void> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
}
