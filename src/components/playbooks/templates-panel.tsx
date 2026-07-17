"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DesktopOnly } from "@/components/mobile/primitives";
import { useIsClient } from "@/hooks/use-is-client";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { EmailTemplate } from "@/types/playbooks";
import { toast } from "sonner";

function TemplateCreateForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Quick intro: {{company}}");
  const [body, setBody] = useState("Hi {{name}},\n\nWould love a brief intro call.");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          body_html: body.replace(/\n/g, "<br>"),
          body_text: body,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setName("");
      toast.success("Template created");
      onCreated();
    } catch {
      toast.error("Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <p className="text-sm font-medium">New template</p>
      <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
      <Button size="sm" onClick={create} disabled={saving}>
        {saving ? "Saving..." : "Create template"}
      </Button>
    </div>
  );
}

export function TemplatesPanel() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirmDialog();

  const { data: templatesData } = useQuery<{ templates: EmailTemplate[] }>({
    queryKey: ["email-templates"],
    queryFn: () => fetch("/api/email-templates").then((r) => r.json()),
    enabled: mounted,
  });

  const deleteTemplate = async (template: EmailTemplate) => {
    const confirmed = await confirm({
      title: "Delete this template?",
      description: `“${template.name}” will be permanently deleted.`,
      confirmLabel: "Delete template",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/email-templates?id=${template.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    } catch {
      toast.error("Failed to delete template");
    }
  };

  return (
    <Card className={cn(isMobileApp && "mobile-card-flat border-0 shadow-none")}>
      <CardHeader className={cn(isMobileApp && "px-4 pt-4 pb-2")}>
        <CardTitle className="text-base">Email templates</CardTitle>
        <DesktopOnly>
          <CardDescription>
            Use merge tags: {"{{name}}"}, {"{{company}}"}, {"{{title}}"}
          </CardDescription>
        </DesktopOnly>
      </CardHeader>
      <CardContent className={cn("space-y-3", isMobileApp && "px-4 pb-4")}>
        {templatesData?.templates.map((template) => (
          <div
            key={template.id}
            className={cn(
              "flex items-center justify-between",
              isMobileApp ? "mobile-list-row py-3" : "rounded-lg border p-3",
            )}
          >
            <div>
              <p className="font-medium">{template.name}</p>
              <p className="text-xs text-muted-foreground">{template.subject}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => void deleteTemplate(template)}
            >
              Delete
            </Button>
          </div>
        ))}
        {!templatesData?.templates.length && (
          <p className="text-sm text-muted-foreground">No templates yet. Create one below.</p>
        )}
        <TemplateCreateForm
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["email-templates"] })}
        />
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
