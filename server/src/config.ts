import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8082),
  UPDATE_INTERVAL_MINUTES: z.coerce.number().default(30),
  UE5_RELEASE: z.string().default("2026-05-05T00:00:00Z"),
  STEAM_API_KEY: z.string().optional(),
  STEAM_APP_ID: z.coerce.number().default(440900),
  WORKSHOP_DISCOVERY_MODE: z.enum(["all", "manual"]).default("all"),
  WORKSHOP_PAGE_SIZE: z.coerce.number().default(100),
  WORKSHOP_MAX_PAGES: z.coerce.number().default(200),
  WORKSHOP_IDS: z
    .string()
    .default("880454836,931088249,1396310739,1369743238")
});

const env = EnvSchema.parse(process.env);

export const config = {
  port: env.PORT,
  updateIntervalMinutes: env.UPDATE_INTERVAL_MINUTES,
  ue5Release: new Date(env.UE5_RELEASE),
  steamApiKey: env.STEAM_API_KEY,
  steamAppId: env.STEAM_APP_ID,
  workshopDiscoveryMode: env.WORKSHOP_DISCOVERY_MODE,
  workshopPageSize: env.WORKSHOP_PAGE_SIZE,
  workshopMaxPages: env.WORKSHOP_MAX_PAGES,
  workshopIds: env.WORKSHOP_IDS.split(",").map((item: string) => item.trim())
};
