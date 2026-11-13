/**
 * Write-scope matching for agent roles.
 *
 * Patterns are repo-relative globs, anchored at the repo root:
 *   `*`  matches within one path segment
 *   `?`  matches one character within a segment
 *   `**` matches any number of segments (including none)
 *   `!pattern` excludes paths that would otherwise be in scope
 *
 * A path is in scope when it matches at least one positive pattern and
 * no negative pattern. Read-only roles (or an empty scope) match nothing.
 */
import type { Role } from "./registry.ts";

const regexCache = new Map<string, RegExp>();

const escapeRegex = (char: string): string => (/[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char);

export function globToRegExp(glob: string): RegExp {
  const cached = regexCache.get(glob);
  if (cached) return cached;

  let source = "";
  let i = 0;
  while (i < glob.length) {
    const char = glob[i] as string;
    if (char === "*") {
      if (glob[i + 1] === "*") {
        const atSegmentStart = i === 0 || glob[i - 1] === "/";
        const next = glob[i + 2];
        if (atSegmentStart && next === "/") {
          // `**/` -> zero or more leading segments
          source += "(?:.*/)?";
          i += 3;
          continue;
        }
        if (atSegmentStart && next === undefined) {
          // trailing `**` -> anything below (`dir/**` matches files under dir, not `dir` itself)
          source += ".*";
          i += 2;
          continue;
        }
        source += ".*";
        i += 2;
        continue;
      }
      source += "[^/]*";
      i += 1;
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      i += 1;
      continue;
    }
    source += escapeRegex(char);
    i += 1;
  }

  const regex = new RegExp(`^${source}$`);
  regexCache.set(glob, regex);
  return regex;
}

/**
 * Normalize to a clean repo-relative POSIX path. Returns null for paths
 * that are absolute or escape the repo root.
 */
export function normalizeRepoPath(path: string): string | null {
  let p = path.trim().replace(/\\/g, "/");
  if (p === "" || p.startsWith("/") || /^[A-Za-z]:\//.test(p)) return null;
  const parts: string[] = [];
  for (const segment of p.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  p = parts.join("/");
  return p === "" ? null : p;
}

export function matchesGlob(glob: string, path: string): boolean {
  return globToRegExp(glob).test(path);
}

export function isPathInScopeGlobs(scope: ReadonlyArray<string>, path: string): boolean {
  const normalized = normalizeRepoPath(path);
  if (normalized === null) return false;
  let included = false;
  for (const pattern of scope) {
    if (pattern.startsWith("!")) {
      if (matchesGlob(pattern.slice(1), normalized)) return false;
    } else if (!included && matchesGlob(pattern, normalized)) {
      included = true;
    }
  }
  return included;
}

export function isPathInScope(role: Pick<Role, "readOnly" | "writeScope">, path: string): boolean {
  if (role.readOnly) return false;
  return isPathInScopeGlobs(role.writeScope, path);
}

/** Paths from `paths` that the role is not allowed to write. */
export function pathsOutOfScope(
  role: Pick<Role, "readOnly" | "writeScope">,
  paths: ReadonlyArray<string>,
): string[] {
  return paths.filter((path) => !isPathInScope(role, path));
}
