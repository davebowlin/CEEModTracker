import { describe, expect, it } from "vitest";
import { classifyMod } from "../src/lib/classify.js";
describe("classifyMod", () => {
    const ue5Release = new Date("2026-05-05T00:00:00Z");
    it("returns Enhanced for explicit Enhanced/UE5 wording", () => {
        const result = classifyMod({
            title: "My Enhanced Collection",
            description: "Now fully UE5 ready",
            timeUpdatedUnix: 1,
            ue5Release
        });
        expect(result).toBe("Enhanced");
    });
    it("returns Legacy for legacy wording", () => {
        const result = classifyMod({
            title: "Legacy build",
            description: "UE4 only",
            timeUpdatedUnix: 1,
            ue5Release
        });
        expect(result).toBe("Legacy");
    });
});
