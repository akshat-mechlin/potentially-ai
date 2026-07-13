import { describe, expect, it } from "vitest";
import {
  CONTACT_CSV_TEMPLATE_HEADERS,
  parseContactsCsv,
  splitCsvLine,
} from "@/lib/csv/parse-contacts";

describe("parseContactsCsv", () => {
  it("parses quoted company names with commas", () => {
    const csv = [
      "name,email,title,company",
      'Skye,skye@sandboxbanking.com,CTO,"Sandbox Banking, an nCino Company"',
    ].join("\n");

    expect(splitCsvLine(csv.split("\n")[1])).toEqual([
      "Skye",
      "skye@sandboxbanking.com",
      "CTO",
      "Sandbox Banking, an nCino Company",
    ]);

    const rows = parseContactsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].company_name).toBe("Sandbox Banking, an nCino Company");
  });

  it("accepts alternate headers", () => {
    const csv = "full name,e-mail,job title,organization\nAlex,alex@acme.com,CEO,Acme\n";
    const rows = parseContactsCsv(csv);
    expect(rows[0]).toMatchObject({
      full_name: "Alex",
      email: "alex@acme.com",
      title: "CEO",
      company_name: "Acme",
    });
  });

  it("maps first/last name and optional enrichment fields", () => {
    const headers = CONTACT_CSV_TEMPLATE_HEADERS.join(",");
    const row = [
      "Alex",
      "Morgan",
      "CEO",
      "Acme Ventures",
      "",
      "alex@acme.com",
      "Verified",
      "",
      "",
      "",
      "",
      "",
      "C-Level",
      "Executive",
      "",
      "",
      "+1 415 555 0100",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "120",
      "Venture Capital",
      "",
      "https://linkedin.com/in/alexmorgan",
      "",
      "",
      "",
      "",
      "San Francisco",
      "CA",
      "United States",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ].join(",");

    const parsed = parseContactsCsv(`${headers}\n${row}\n`);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      full_name: "Alex Morgan",
      first_name: "Alex",
      last_name: "Morgan",
      email: "alex@acme.com",
      title: "CEO",
      company_name: "Acme Ventures",
      phone: "+1 415 555 0100",
      linkedin_url: "https://linkedin.com/in/alexmorgan",
      location: "San Francisco, CA, United States",
    });
    expect(parsed[0].extras).toMatchObject({
      email_status: "Verified",
      seniority: "C-Level",
      departments: "Executive",
      employees: "120",
      industry: "Venture Capital",
      city: "San Francisco",
    });
  });

  it("allows sparse rows with only email", () => {
    const csv = "Email,Title\njordan@northstar.io,CTO\n";
    const rows = parseContactsCsv(csv);
    expect(rows[0]).toMatchObject({
      full_name: "jordan@northstar.io",
      email: "jordan@northstar.io",
      title: "CTO",
    });
  });
});
