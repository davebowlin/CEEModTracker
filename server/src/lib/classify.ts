import type { ModStatus } from "../types.js";

export function classifyMod(input: {
  title: string;
  description: string;
  timeUpdatedUnix: number;
  ue5Release: Date;
  tags?: string[];
}): ModStatus {
  const updated = new Date(input.timeUpdatedUnix * 1000);

  // Strict date-based check: anything before the UE5 release is Legacy
  if (updated < input.ue5Release) {
    return "Legacy";
  }

  const tags = (input.tags || []).map((t) => t.toLowerCase());

  if (tags.includes("enhanced")) {
    return "Enhanced";
  }

  if (tags.includes("legacy")) {
    return "Legacy";
  }

  const text = `${input.title} ${input.description}`.toLowerCase();

  if (text.includes("legacy") || text.includes("ue4")) {
    return "Legacy";
  }

  if (text.includes("enhanced") || text.includes("ue5")) {
    return "Enhanced";
  }

  return "Likely Compatible";
}
