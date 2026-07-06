import { describe, expect, it } from "vitest";
import { getRecentActivity } from "@/lib/data/activity";

describe("activity feed", () => {
  it("returns demo activity items in demo mode", async () => {
    const items = await getRecentActivity();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("event");
    expect(items[0]).toHaveProperty("time");
  });
});
