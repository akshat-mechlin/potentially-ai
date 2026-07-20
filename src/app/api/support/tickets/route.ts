import { NextResponse } from "next/server";
import { z } from "zod";
import { createTicket, listMyTickets } from "@/lib/data/support-tickets";
import { featureDisabledResponse } from "@/lib/data/feature-flags";
import { collectFormFiles } from "@/lib/support/attachments";

export async function GET() {
  try {
    const disabled = await featureDisabledResponse("support_ticketing", "Support Ticketing");
    if (disabled) return disabled;
    const tickets = await listMyTickets();
    return NextResponse.json({ tickets });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List tickets failed:", error);
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 });
  }
}

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().max(10000).default(""),
  category: z.string().max(64).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("support_ticketing", "Support Ticketing");
    if (disabled) return disabled;

    const contentType = request.headers.get("content-type") || "";
    let subject: string;
    let body: string;
    let category: string | undefined;
    let priority: "low" | "medium" | "high" | "urgent" | undefined;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      subject = String(form.get("subject") ?? "");
      body = String(form.get("body") ?? "");
      category = form.get("category") ? String(form.get("category")) : undefined;
      const rawPriority = form.get("priority") ? String(form.get("priority")) : undefined;
      priority = rawPriority as typeof priority;
      files = collectFormFiles(form);
    } else {
      const json = createSchema.parse(await request.json());
      subject = json.subject;
      body = json.body;
      category = json.category;
      priority = json.priority;
    }

    const parsed = createSchema.parse({ subject, body, category, priority });
    if (parsed.body.trim().length < 5 && files.length === 0) {
      return NextResponse.json(
        { error: "Add a few details or attach a file." },
        { status: 400 },
      );
    }

    const ticket = await createTicket({ ...parsed, files });
    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid ticket data" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Create ticket failed:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
