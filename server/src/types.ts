export type ModStatus = "Enhanced" | "Likely Compatible" | "Legacy";

export interface ModRecord {
  id: string;
  title: string;
  description: string;
  author: string;
  timeUpdatedUnix: number;
  updatedAtIso: string;
  status: ModStatus;
  views: number;
  subscriptions: number;
  favorited: number;
  fileSizeBytes: number;
  steamLink: string;
}

export interface ModsDatabase {
  lastSyncAtIso: string;
  itemCount: number;
  mods: ModRecord[];
}
