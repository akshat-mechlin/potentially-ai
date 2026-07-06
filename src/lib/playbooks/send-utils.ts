import type { SendConfig } from "@/types/playbooks";

export function isWeekend(date = new Date()) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function parseTimeToMinutes(value: string | undefined) {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function canSendNow(sendConfig: SendConfig, now = new Date()): { ok: boolean; reason?: string } {
  if (sendConfig.skip_weekends && isWeekend(now)) {
    return { ok: false, reason: "Weekend sending is disabled" };
  }

  const start = parseTimeToMinutes(sendConfig.send_window_start);
  const end = parseTimeToMinutes(sendConfig.send_window_end);
  if (start != null && end != null) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes < start || minutes > end) {
      return { ok: false, reason: "Outside send window" };
    }
  }

  return { ok: true };
}

export function addBusinessDays(days: number, from = new Date()) {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added += 1;
  }
  return result;
}

export function computeNextActionAt(delayDays: number, sendConfig: SendConfig) {
  const base = addBusinessDays(Math.max(0, delayDays));
  if (sendConfig.skip_weekends) {
    while (isWeekend(base)) {
      base.setDate(base.getDate() + 1);
    }
  }
  const start = parseTimeToMinutes(sendConfig.send_window_start) ?? 9 * 60;
  base.setHours(Math.floor(start / 60), start % 60, 0, 0);
  return base.toISOString();
}
