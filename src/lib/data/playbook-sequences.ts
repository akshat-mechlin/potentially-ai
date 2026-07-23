import { isDataDemoMode } from "@/lib/app-config";
import { generateOutreach } from "@/lib/ai/openai";
import { buildRecipientFacts } from "@/lib/ai/outreach-prompt";
import { getPlaybook } from "@/lib/data/playbooks";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeNextActionAt } from "@/lib/playbooks/send-utils";
import type { Playbook, SequenceStep } from "@/types/playbooks";

export async function listSequenceSteps(playbookId: string): Promise<SequenceStep[]> {
  if (isDataDemoMode()) {
    const playbook = await getPlaybook(playbookId);
    return (playbook?.settings?.sequence_steps ?? []) as SequenceStep[];
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("playbook_sequence_steps")
    .select("*")
    .eq("playbook_id", playbookId)
    .order("step_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SequenceStep[];
}

function normalizeAllowedWeekdays(values?: number[] | null) {
  if (!values?.length) return [1, 2, 3, 4, 5];
  return [...new Set(values.filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
}

export async function saveSequenceSteps(
  playbookId: string,
  steps: Array<{
    delay_days: number;
    tone?: string;
    goal_override?: string;
    subject_hint?: string;
    allowed_weekdays?: number[];
  }>,
  actor?: import("@/lib/workflows/actor").WorkflowActor | null,
) {
  if (isDataDemoMode()) {
    const { updateDemoPlaybook } = await import("@/lib/demo-store/playbooks");
    updateDemoPlaybook(playbookId, {
      settings: {
        sequence_steps: steps.map((step, i) => ({
          id: `step-${i}`,
          playbook_id: playbookId,
          step_order: i,
          delay_days: step.delay_days,
          allowed_weekdays: normalizeAllowedWeekdays(step.allowed_weekdays),
          tone: step.tone ?? "professional",
          goal_override: step.goal_override ?? null,
          subject_hint: step.subject_hint ?? null,
          created_at: new Date().toISOString(),
        })),
      },
    });
    return;
  }

  const supabase = actor?.supabase ?? (await getUserWorkspaceContext()).supabase;
  if (!supabase) throw new Error("Unauthorized");

  await supabase.from("playbook_sequence_steps").delete().eq("playbook_id", playbookId);

  if (steps.length) {
    await supabase.from("playbook_sequence_steps").insert(
      steps.map((step, index) => ({
        playbook_id: playbookId,
        step_order: index,
        delay_days: step.delay_days,
        allowed_weekdays: normalizeAllowedWeekdays(step.allowed_weekdays),
        tone: step.tone ?? "professional",
        goal_override: step.goal_override ?? null,
        subject_hint: step.subject_hint ?? null,
      })),
    );
  }
}

export async function scheduleFollowUpForProspect(
  runContactId: string,
  playbook: Playbook,
  currentStep: number,
  actor?: import("@/lib/workflows/actor").WorkflowActor | null,
) {
  const steps = actor
    ? await listSequenceStepsAdmin(playbook.id)
    : await listSequenceSteps(playbook.id);
  const nextStep = steps[currentStep + 1];
  if (!nextStep) return null;

  const nextAt = computeNextActionAt(
    nextStep.delay_days,
    playbook.send_config,
    nextStep.allowed_weekdays,
  );

  if (isDataDemoMode()) {
    const { updateDemoProspect } = await import("@/lib/demo-store/playbooks");
    updateDemoProspect(runContactId, {
      status: "queued",
      next_action_at: nextAt,
    } as Partial<import("@/types/playbooks").PlaybookProspect>);
    return nextAt;
  }

  const supabase = actor?.supabase ?? (await getUserWorkspaceContext()).supabase;
  if (!supabase) return null;

  await supabase
    .from("playbook_run_contacts")
    .update({
      status: "queued",
      current_sequence_step: currentStep + 1,
      next_action_at: nextAt,
      last_action_at: new Date().toISOString(),
    })
    .eq("id", runContactId);

  return nextAt;
}

async function listSequenceStepsAdmin(playbookId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("playbook_sequence_steps")
    .select("*")
    .eq("playbook_id", playbookId)
    .order("step_order", { ascending: true });
  return (data ?? []) as SequenceStep[];
}

export async function processDueSequenceFollowUps() {
  if (isDataDemoMode()) return { processed: 0 };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { processed: 0 };
  }

  const now = new Date().toISOString();
  const { data: due } = await supabase
    .from("playbook_run_contacts")
    .select("*, run:playbook_runs(*, playbook:playbooks(*))")
    .eq("status", "queued")
    .lte("next_action_at", now)
    .limit(25);

  let processed = 0;

  for (const row of due ?? []) {
    const run = row.run as {
      dry_run: boolean;
      workspace_id: string;
      triggered_by: string | null;
      playbook: Playbook;
    } | null;
    const playbook = run?.playbook;
    if (!playbook || !row.contact_id || !run?.workspace_id) continue;

    const steps = await listSequenceStepsAdmin(playbook.id);
    const step = steps[(row.current_sequence_step as number) ?? 0];
    if (!step) continue;

    const allowed = step.allowed_weekdays?.length ? step.allowed_weekdays : [1, 2, 3, 4, 5];
    if (!allowed.includes(new Date().getDay())) {
      const { computeNextActionAt } = await import("@/lib/playbooks/send-utils");
      await supabase
        .from("playbook_run_contacts")
        .update({
          next_action_at: computeNextActionAt(0, playbook.send_config, allowed),
        })
        .eq("id", row.id);
      continue;
    }

    const { data: contact } = await supabase
      .from("contacts")
      .select("full_name, title, company_name, email, location, bio, linkedin_url, tags")
      .eq("id", row.contact_id)
      .maybeSingle();

    if (!contact?.email) continue;

    try {
      const outreach = await generateOutreach({
        contactName: contact.full_name,
        contactTitle: contact.title,
        companyName: contact.company_name,
        type: "cold_email",
        tone: step.tone,
        goal: step.goal_override ?? playbook.goal ?? "Follow up on previous outreach",
        context: step.subject_hint ?? undefined,
        recipientFacts: buildRecipientFacts(contact),
      });

      if (run?.dry_run || playbook.automation_level === "assist") {
        await supabase
          .from("playbook_run_contacts")
          .update({
            status: "pending_approval",
            draft_subject: outreach.subject ?? step.subject_hint ?? "Follow up",
            draft_body: outreach.body,
            next_action_at: null,
            last_action_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      } else {
        const { approveAndSendProspect } = await import("@/lib/data/playbooks");
        const { adminActorForWorkflow } = await import("@/lib/workflows/actor");
        const actorUserId = run.triggered_by;
        if (!actorUserId) {
          console.error("[sequence-cron] missing triggered_by for run", row.run_id);
          continue;
        }
        await supabase
          .from("playbook_run_contacts")
          .update({
            draft_subject: outreach.subject,
            draft_body: outreach.body,
          })
          .eq("id", row.id);
        await approveAndSendProspect(
          row.id,
          row.run_id,
          adminActorForWorkflow({
            userId: actorUserId,
            workspaceId: run.workspace_id,
          }),
        );
      }

      processed += 1;
    } catch (error) {
      console.error("[sequence-cron] follow-up failed for", row.id, error);
    }
  }

  return { processed };
}
