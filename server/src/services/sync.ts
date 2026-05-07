import { config } from "../config.js";
import { classifyMod } from "../lib/classify.js";
import type { ModRecord } from "../types.js";
import { readDatabase, writeDatabase } from "./database.js";
import { discoverAllWorkshopIds, fetchWorkshopDetails } from "./steam.js";

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

export async function syncModsNow(): Promise<void> {
  let ids = config.workshopIds;
  if (config.workshopDiscoveryMode === "all") {
    if (!config.steamApiKey) {
      console.warn(
        "[sync] STEAM_API_KEY missing. Falling back to WORKSHOP_IDS. Set STEAM_API_KEY for full discovery."
      );
    } else {
      const [enhancedIds, legacyIds] = await Promise.all([
        discoverAllWorkshopIds({
          apiKey: config.steamApiKey,
          appId: config.steamAppId,
          pageSize: config.workshopPageSize,
          maxPages: config.workshopMaxPages,
          requiredtags: ["Enhanced"]
        }),
        discoverAllWorkshopIds({
          apiKey: config.steamApiKey,
          appId: config.steamAppId,
          pageSize: config.workshopPageSize,
          maxPages: config.workshopMaxPages,
          requiredtags: ["Legacy"]
        })
      ]);
      ids = [...new Set([...enhancedIds, ...legacyIds])];
    }
  }

  const batches = chunk(ids, 100);
  const steamMods = (
    await Promise.all(batches.map(async (batch) => fetchWorkshopDetails(batch)))
  ).flat();

  const mapped: ModRecord[] = steamMods.map((item) => {
    const updatedAtIso = new Date(item.time_updated * 1000).toISOString();
    const description = item.description?.trim() ?? "";

    const tags = item.tags?.map(t => t.tag) || [];

    const status = classifyMod({
      title: item.title,
      description,
      timeUpdatedUnix: item.time_updated,
      ue5Release: config.ue5Release,
      tags
    });

    return {
      id: item.publishedfileid,
      title: item.title,
      description,
      author: item.creator,
      timeUpdatedUnix: item.time_updated,
      updatedAtIso,
      status,
      views: item.views ?? 0,
      subscriptions: item.subscriptions ?? 0,
      favorited: item.favorited ?? 0,
      fileSizeBytes: item.file_size ?? 0,
      steamLink: `https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`
    };
  });

  const existing = await readDatabase();
  const merged = {
    ...existing,
    lastSyncAtIso: new Date().toISOString(),
    itemCount: mapped.length,
    mods: mapped.sort((a, b) => b.timeUpdatedUnix - a.timeUpdatedUnix)
  };
  await writeDatabase(merged);
}
