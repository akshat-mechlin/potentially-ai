import { describe, expect, it } from "vitest";
import {
  mapApolloOrganizationToRecord,
  mapApolloPersonToRecord,
  mapContactToApolloRecordStub,
  resolveApolloPersonId,
} from "@/lib/integrations/apollo/map-to-record";

describe("map-to-record", () => {
  it("maps obfuscated Apollo search person to record with display name", () => {
    const row = mapApolloPersonToRecord({
      id: "66fc9d250cbf9000016694f7",
      first_name: "Ryan",
      last_name_obfuscated: "Ot***i",
      title: "Co-Founder and CEO",
      has_email: true,
      organization: { name: "Intelligent IT" },
    });

    expect(row).not.toBeNull();
    expect(row?.apollo_id).toBe("66fc9d250cbf9000016694f7");
    expect(row?.name).toBe("Ryan Ot***i");
    expect(row?.company_name).toBe("Intelligent IT");
  });

  it("derives fallback apollo id from email when person id missing", () => {
    expect(resolveApolloPersonId({ email: "ryan@example.com" })).toBe("email:ryan@example.com");
  });

  it("maps organization by domain fallback", () => {
    const row = mapApolloOrganizationToRecord({
      name: "Intelligent IT",
      primary_domain: "intelligentit.com",
    });

    expect(row?.apollo_id).toBe("domain:intelligentit.com");
    expect(row?.name).toBe("Intelligent IT");
  });

  it("creates contact stub with contact-prefixed id when no email", () => {
    const row = mapContactToApolloRecordStub({
      id: "11111111-1111-1111-1111-111111111111",
      full_name: "Jane Doe",
    });

    expect(row.apollo_id).toBe("contact:11111111-1111-1111-1111-111111111111");
    expect(row.raw_apollo.stub).toBe(true);
  });
});
