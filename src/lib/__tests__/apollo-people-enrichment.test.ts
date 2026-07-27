import { describe, expect, it, vi, beforeEach } from "vitest";
import { enrichApolloPerson } from "@/lib/integrations/apollo/people-enrichment";

vi.mock("@/lib/integrations/apollo/client", () => ({
  apolloApiRequest: vi.fn(),
}));

import { apolloApiRequest } from "@/lib/integrations/apollo/client";

const mockedRequest = vi.mocked(apolloApiRequest);

describe("enrichApolloPerson", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("uses GET /people/{id} when Apollo person id is provided", async () => {
    mockedRequest.mockResolvedValue({
      person: { id: "66fa5bf3a9886c0001a32a6f", name: "Ralph Admin" },
    });

    const result = await enrichApolloPerson("token", {
      id: "66fa5bf3a9886c0001a32a6f",
    });

    expect(mockedRequest).toHaveBeenCalledWith("/people/66fa5bf3a9886c0001a32a6f", {
      accessToken: "token",
      method: "GET",
    });
    expect(result.person?.name).toBe("Ralph Admin");
  });

  it("accepts a direct person payload from GET /people/{id}", async () => {
    mockedRequest.mockResolvedValue({
      id: "66fa5bf3a9886c0001a32a6f",
      name: "Ralph Admin",
    });

    const result = await enrichApolloPerson("token", {
      id: "66fa5bf3a9886c0001a32a6f",
    });

    expect(result.person?.name).toBe("Ralph Admin");
  });

  it("uses people/match when no id is provided", async () => {
    mockedRequest.mockResolvedValue({
      person: { name: "Jane Doe" },
    });

    await enrichApolloPerson("token", {
      email: "jane@example.com",
    });

    expect(mockedRequest).toHaveBeenCalledWith("/people/match", {
      accessToken: "token",
      method: "POST",
      params: {
        email: "jane@example.com",
        first_name: undefined,
        last_name: undefined,
        name: undefined,
        organization_name: undefined,
        domain: undefined,
        linkedin_url: undefined,
        reveal_personal_emails: false,
      },
    });
  });
});
