import { describe, it, expect } from "vitest";
import { slugify, getInitials, truncate } from "@/lib/utils";

describe("utils", () => {
  it("slugifies text", () => {
    expect(slugify("Acme Ventures")).toBe("acme-ventures");
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("gets initials", () => {
    expect(getInitials("Alex Morgan")).toBe("AM");
    expect(getInitials("Sarah")).toBe("S");
  });

  it("truncates strings", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
    expect(truncate("Hi", 10)).toBe("Hi");
  });
});
