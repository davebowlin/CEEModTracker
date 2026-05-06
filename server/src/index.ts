import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cron from "node-cron";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { modsRouter } from "./routes/mods.js";
import { ensureDatabaseExists } from "./services/database.js";
import { syncModsNow } from "./services/sync.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  await ensureDatabaseExists();
  let lastSyncError = "";

  const runSync = async () => {
    try {
      await syncModsNow();
      lastSyncError = "";
      console.log(`[sync] complete @ ${new Date().toISOString()}`);
    } catch (error) {
      lastSyncError = error instanceof Error ? error.message : String(error);
      console.error("[sync] failed", error);
      throw error;
    }
  };

  await runSync();

  cron.schedule(`*/${config.updateIntervalMinutes} * * * *`, async () => {
    try {
      await runSync();
    } catch {
      // Error already logged in runSync.
    }
  });

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "250kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, now: new Date().toISOString() });
  });

  app.use("/api/mods", modsRouter);
  app.get("/api/status", (_req, res) => {
    res.json({
      discoveryMode: config.workshopDiscoveryMode,
      hasSteamApiKey: Boolean(config.steamApiKey),
      syncRequiresPassword: Boolean(config.adminSyncPassword),
      lastSyncError
    });
  });
  app.post("/api/sync", async (req, res) => {
    if (config.adminSyncPassword) {
      const provided = req.header("x-admin-password") ?? "";
      if (provided !== config.adminSyncPassword) {
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }
    }
    try {
      await runSync();
      res.json({ ok: true, syncedAt: new Date().toISOString() });
    } catch {
      res.status(500).json({ ok: false, error: lastSyncError || "Sync failed" });
    }
  });

  const builtClientPath = path.resolve(__dirname, "../client");
  const sourceClientPath = path.resolve(__dirname, "../../client");
  const clientPath = fs.existsSync(path.join(builtClientPath, "index.html"))
    ? builtClientPath
    : sourceClientPath;
  app.use(express.static(clientPath));
  app.use((_req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });

  app.listen(config.port, () => {
    console.log(`CEE Mods Tracker running on port ${config.port}`);
  });
}

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
