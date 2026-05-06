import type { ModStatus } from "../types.js";

export function classifyMod(input: {
  title: string;
  description: string;
  timeUpdatedUnix: number;
  ue5Release: Date;
}): ModStatus {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const updated = new Date(input.timeUpdatedUnix * 1000);

  if (text.includes("legacy") || text.includes("ue4")) {
    return "Legacy";
  }

  if (text.includes("enhanced") || text.includes("ue5")) {
    return "Enhanced";
  }

  if (updated > input.ue5Release) {
    return "Likely Compatible";
  }

  return "Legacy";
}
