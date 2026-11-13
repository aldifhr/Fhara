/**
 * Rule-based role router.
 *
 * 1. An @mention of a role id or display name wins (first mention in the text).
 * 2. Otherwise the role with the most domain-keyword hits wins
 *    (ties go to the earlier role in the registry).
 * 3. Otherwise `support`.
 */
import { ROLES, type Role, type RoleId } from "./registry.ts";

export type RouteVia = "mention" | "keyword" | "fallback";

export interface RouteResult {
  readonly roleId: RoleId;
  readonly via: RouteVia;
  /** Keywords that matched (keyword route) or the mention token (mention route). */
  readonly matched: ReadonlyArray<string>;
}

export const FALLBACK_ROLE_ID: RoleId = "support";

const compact = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Mention handles per role: id, compact display name, and display-name words joined. */
function mentionHandles(role: Role): string[] {
  const handles = new Set<string>([compact(role.id), compact(role.displayName)]);
  return [...handles].filter((h) => h.length > 0);
}

function findMention(text: string, roles: ReadonlyArray<Role>): RouteResult | null {
  const lower = text.toLowerCase();
  let best: { index: number; role: Role; token: string } | null = null;

  for (const role of roles) {
    // "@UI/UX Designer" style: full display name after @.
    const nameRegex = new RegExp(`@${escapeRegex(role.displayName.toLowerCase())}(?![a-z0-9])`);
    const nameMatch = nameRegex.exec(lower);
    if (nameMatch && (best === null || nameMatch.index < best.index)) {
      best = { index: nameMatch.index, role, token: nameMatch[0] };
    }
  }

  const tokenRegex = /@([a-z0-9][a-z0-9/_-]*)/g;
  for (const match of lower.matchAll(tokenRegex)) {
    const index = match.index ?? 0;
    if (index > 0 && /[a-z0-9._%+-]/.test(lower[index - 1] as string)) continue; // email addresses
    const token = compact(match[1] as string);
    const role = roles.find((r) => mentionHandles(r).includes(token));
    if (role && (best === null || index < best.index)) {
      best = { index, role, token: match[0] };
    }
  }

  return best ? { roleId: best.role.id, via: "mention", matched: [best.token] } : null;
}

function keywordHits(text: string, keywords: ReadonlyArray<string>): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const keyword of keywords) {
    const k = keyword.toLowerCase();
    const regex = new RegExp(`(?<![a-z0-9])${escapeRegex(k)}(?![a-z0-9])`);
    if (regex.test(lower)) hits.push(keyword);
  }
  return hits;
}

export function routeRole(text: string, roles: ReadonlyArray<Role> = ROLES): RouteResult {
  const mention = findMention(text, roles);
  if (mention) return mention;

  let best: { role: Role; hits: string[] } | null = null;
  for (const role of roles) {
    const hits = keywordHits(text, role.keywords);
    if (hits.length > 0 && (best === null || hits.length > best.hits.length)) {
      best = { role, hits };
    }
  }
  if (best) return { roleId: best.role.id, via: "keyword", matched: best.hits };

  return { roleId: FALLBACK_ROLE_ID, via: "fallback", matched: [] };
}
