import type { Contact } from "@/types";
import type { IcpProfile, MatchingConfig, OutreachMode } from "@/types/playbooks";

export type MatchResult = {
  contact: Contact;
  score: number;
  reason: string;
  signals: string[];
  warmPath: string[];
  skipped?: boolean;
  skipReason?: string;
};

function normalize(text: string | null | undefined) {
  return (text ?? "").toLowerCase();
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function countKeywordHits(contact: Contact, keywords: string[]) {
  const blob = [
    contact.full_name,
    contact.title,
    contact.company_name,
    contact.email,
    contact.bio,
    ...(contact.tags ?? []),
  ]
    .map(normalize)
    .join(" ");
  return keywords.filter((kw) => blob.includes(kw.toLowerCase())).length;
}

export function scoreContactForIcp(
  contact: Contact,
  icp: IcpProfile,
  config: MatchingConfig,
  outreachMode: OutreachMode,
  options?: {
    isOnPlatform?: boolean;
    inActivePlaybook?: boolean;
    doNotContact?: boolean;
    lastContactedDaysAgo?: number | null;
    ownerName?: string | null;
    currentUserId?: string;
  },
): MatchResult {
  const signals: string[] = [];
  let score = 0;

  if (options?.doNotContact) {
    return {
      contact,
      score: 0,
      reason: "On do-not-contact list",
      signals: ["suppressed"],
      warmPath: [],
      skipped: true,
      skipReason: "do_not_contact",
    };
  }

  if (options?.inActivePlaybook) {
    return {
      contact,
      score: 0,
      reason: "Already in an active playbook",
      signals: ["deduped"],
      warmPath: [],
      skipped: true,
      skipReason: "active_playbook",
    };
  }

  const cooldown = config.cooldown_days ?? 30;
  if (
    options?.lastContactedDaysAgo != null &&
    options.lastContactedDaysAgo < cooldown
  ) {
    return {
      contact,
      score: 0,
      reason: `Contacted within last ${cooldown} days`,
      signals: ["cooldown"],
      warmPath: [],
      skipped: true,
      skipReason: "cooldown",
    };
  }

  const title = normalize(contact.title);
  const company = normalize(contact.company_name);

  if (icp.title_include?.length && !includesAny(title, icp.title_include)) {
    return {
      contact,
      score: 0,
      reason: "Title does not match ICP",
      signals: ["title_mismatch"],
      warmPath: [],
      skipped: true,
      skipReason: "title",
    };
  }

  if (icp.title_exclude?.length && includesAny(title, icp.title_exclude)) {
    return {
      contact,
      score: 0,
      reason: "Title excluded by ICP",
      signals: ["title_excluded"],
      warmPath: [],
      skipped: true,
      skipReason: "title_exclude",
    };
  }

  if (icp.title_include?.length && includesAny(title, icp.title_include)) {
    score += Math.round(25 * (config.title_weight ?? 1));
    signals.push("title_match");
  }

  const mustHits = countKeywordHits(contact, icp.keywords_must ?? []);
  if ((icp.keywords_must?.length ?? 0) > 0 && mustHits === 0) {
    return {
      contact,
      score: 0,
      reason: "Missing required keywords",
      signals: ["keyword_miss"],
      warmPath: [],
      skipped: true,
      skipReason: "keywords",
    };
  }
  if (mustHits > 0) {
    score += mustHits * 10;
    signals.push("required_keywords");
  }

  const niceHits = countKeywordHits(contact, icp.keywords_nice ?? []);
  if (niceHits > 0) {
    score += niceHits * 5;
    signals.push("nice_keywords");
  }

  if (icp.keywords_exclude?.length && countKeywordHits(contact, icp.keywords_exclude) > 0) {
    return {
      contact,
      score: 0,
      reason: "Excluded keyword found",
      signals: ["keyword_excluded"],
      warmPath: [],
      skipped: true,
      skipReason: "exclude_keyword",
    };
  }

  if (icp.industries_include?.length && company) {
    if (includesAny(company, icp.industries_include)) {
      score += 15;
      signals.push("industry_match");
    }
  }

  const minStrength = icp.min_strength_score ?? 0;
  if (contact.strength_score >= minStrength) {
    score += Math.min(contact.strength_score / 4, 20);
    if (contact.strength_score >= 50) signals.push("relationship_strength");
  }

  const warmPath: string[] = [];
  const isOwnContact = options?.currentUserId && contact.owner_id === options.currentUserId;
  const inTeammateNetwork = contact.owner_id && !isOwnContact;

  if (inTeammateNetwork && options?.ownerName) {
    warmPath.push(options.ownerName);
    score += Math.round(20 * (config.warm_path_weight ?? 1));
    signals.push("teammate_network");
  } else if (contact.strength_score >= 40) {
    warmPath.push("You");
    score += Math.round(10 * (config.warm_path_weight ?? 1));
    signals.push("direct_connection");
  }

  if (outreachMode === "warm_required" && warmPath.length === 0) {
    return {
      contact,
      score: 0,
      reason: "Warm path required but none found",
      signals: ["no_warm_path"],
      warmPath: [],
      skipped: true,
      skipReason: "warm_required",
    };
  }

  if (outreachMode === "warm_preferred" && warmPath.length > 0) {
    score += 10;
  }

  score = Math.min(100, Math.max(0, score));
  const minScore = config.min_score ?? 40;
  if (score < minScore) {
    return {
      contact,
      score,
      reason: `Below match threshold (${minScore})`,
      signals,
      warmPath,
      skipped: true,
      skipReason: "low_score",
    };
  }

  const reasonParts = [
    signals.includes("teammate_network")
      ? `In ${options?.ownerName ?? "teammate"}'s network`
      : null,
    signals.includes("title_match") ? "Title fits ICP" : null,
    signals.includes("required_keywords") ? "Required keywords matched" : null,
    contact.strength_score >= 50 ? "Strong relationship signal" : null,
  ].filter(Boolean);

  return {
    contact,
    score,
    reason: reasonParts.join(" · ") || "Matches ICP criteria",
    signals,
    warmPath,
  };
}

export function matchContactsForPlaybook(
  contacts: Contact[],
  icp: IcpProfile,
  config: MatchingConfig,
  outreachMode: OutreachMode,
  context: {
    ownerNames: Map<string, string | null>;
    activeContactIds: Set<string>;
    doNotContactIds: Set<string>;
    lastContactedAt?: Map<string, string | null>;
    currentUserId?: string;
  },
): MatchResult[] {
  return scoreAllContactsForPlaybook(contacts, icp, config, outreachMode, context).matched;
}

export function scoreAllContactsForPlaybook(
  contacts: Contact[],
  icp: IcpProfile,
  config: MatchingConfig,
  outreachMode: OutreachMode,
  context: {
    ownerNames: Map<string, string | null>;
    activeContactIds: Set<string>;
    doNotContactIds: Set<string>;
    lastContactedAt?: Map<string, string | null>;
    currentUserId?: string;
  },
): { matched: MatchResult[]; skipped: MatchResult[] } {
  const all = contacts.map((contact) => {
    const lastAt = context.lastContactedAt?.get(contact.id) ?? null;
    const lastContactedDaysAgo = lastAt
      ? Math.floor((Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return scoreContactForIcp(contact, icp, config, outreachMode, {
      ownerName: contact.owner_id ? context.ownerNames.get(contact.owner_id) ?? null : null,
      inActivePlaybook: context.activeContactIds.has(contact.id),
      doNotContact: context.doNotContactIds.has(contact.id),
      lastContactedDaysAgo,
      currentUserId: context.currentUserId,
    });
  });

  const matched = all.filter((r) => !r.skipped).sort((a, b) => b.score - a.score);
  const skipped = all.filter((r) => r.skipped).sort((a, b) => b.score - a.score);
  return { matched, skipped };
}
