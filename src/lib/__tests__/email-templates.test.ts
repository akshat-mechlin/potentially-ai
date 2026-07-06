import { describe, expect, it } from "vitest";
import { applyTemplate } from "@/lib/data/email-templates";
import type { EmailTemplate } from "@/types/playbooks";

const template: EmailTemplate = {
  id: "t1",
  workspace_id: "w1",
  created_by: "u1",
  name: "Intro",
  subject: "Hello {{name}} at {{company}}",
  preheader: null,
  body_html: "<p>Hi {{name}}</p>",
  body_text: "Hi {{name}} from {{company}}",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("applyTemplate", () => {
  it("replaces merge tags", () => {
    const result = applyTemplate(template, {
      name: "Jane",
      company: "Acme",
      title: "CTO",
    });
    expect(result.subject).toBe("Hello Jane at Acme");
    expect(result.body).toContain("Jane");
    expect(result.body).toContain("Acme");
  });
});
