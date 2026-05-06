import dotenv from "dotenv";
import { ensureDatabaseExists } from "./services/database.js";
import { syncModsNow } from "./services/sync.js";

dotenv.config();

async function run() {
  await ensureDatabaseExists();
  await syncModsNow();
  console.log("Manual sync complete.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
