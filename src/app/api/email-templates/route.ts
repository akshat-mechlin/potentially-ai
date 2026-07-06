import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmailTemplate, deleteEmailTemplate, listEmailTemplates } from "@/lib/data/email-templates";

const createSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body_html: z.string().min(1),
  body_text: z.string().optional(),
  preheader: z.string().optional(),
});

export async function GET() {
  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to list templates:", error);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const template = await createEmailTemplate(body);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteEmailTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
