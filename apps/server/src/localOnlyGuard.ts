/**
 * Fhara has no login of its own and binds loopback only. This guard refuses requests whose Host
 * is not a loopback name (DNS rebinding) and whose Origin is not loopback or the desktop app's
 * (other websites). Requests without an Origin (CLI tools, agents on `/mcp`) pass on Host alone.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import * as ServerConfig from "./config.ts";
import { DESKTOP_RENDERER_ORIGINS } from "./httpCors.ts";

const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "::1"]);

export type LocalOnlyVerdict =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "host" | "origin" };

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/\.$/, "");
}

/** Whether a URL hostname (as `URL#hostname` reports it) names this machine's loopback. */
export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTNAMES.has(normalizeHostname(hostname));
}

/**
 * Whether a `Host` header names loopback: `localhost`, `127.0.0.1` or `[::1]`, with or without a
 * port. A missing or malformed Host is refused.
 */
export function isLoopbackHostHeader(host: string | undefined): boolean {
  if (host === undefined) return false;
  const value = host.trim();
  if (value.length === 0 || /[\s/?#@\\]/.test(value)) return false;
  let parsed: URL;
  try {
    parsed = new URL(`http://${value}`);
  } catch {
    return false;
  }
  // `new URL` normalizes `127.1` and friends to 127.0.0.1; only accept the literal spellings.
  const literal = value.replace(/:\d+$/, "");
  return (
    parsed.username === "" &&
    parsed.password === "" &&
    isLoopbackHostname(parsed.hostname) &&
    isLoopbackHostname(literal)
  );
}

/** Whether an `Origin` header is a loopback web origin or one of `trustedOrigins`. */
export function isAllowedOrigin(origin: string, trustedOrigins: ReadonlySet<string>): boolean {
  const value = origin.trim();
  if (trustedOrigins.has(value)) return true;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  return isLoopbackHostname(parsed.hostname);
}

/** The guard's decision for one request's `Host` and `Origin` headers. */
export function checkLocalOnlyRequest(input: {
  readonly host: string | undefined;
  readonly origin: string | undefined;
  readonly trustedOrigins: ReadonlySet<string>;
}): LocalOnlyVerdict {
  if (!isLoopbackHostHeader(input.host)) return { allowed: false, reason: "host" };
  if (input.origin !== undefined && !isAllowedOrigin(input.origin, input.trustedOrigins)) {
    return { allowed: false, reason: "origin" };
  }
  return { allowed: true };
}

/**
 * Origins trusted besides loopback ones: the desktop renderer's custom-scheme origins, and in
 * development the dev server and any configured extra origins that are themselves loopback.
 */
export function resolveTrustedOrigins(
  config: Pick<ServerConfig.ServerConfig["Service"], "devUrl" | "devAllowedOrigins">,
): ReadonlySet<string> {
  const extra = [...(config.devUrl ? [config.devUrl.origin] : []), ...config.devAllowedOrigins];
  return new Set<string>([
    ...DESKTOP_RENDERER_ORIGINS,
    ...extra.filter((origin) => isAllowedOrigin(origin, new Set())),
  ]);
}

const forbidden = (reason: "host" | "origin") =>
  HttpServerResponse.text(
    reason === "host"
      ? "Fhara only answers requests addressed to localhost."
      : "Fhara only answers requests from localhost or the Fhara desktop app.",
    { status: 403 },
  );

/** Refuses every HTTP request and WebSocket upgrade that fails `checkLocalOnlyRequest`. */
export const layer = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ServerConfig.ServerConfig;
    const trustedOrigins = resolveTrustedOrigins(config);
    return HttpRouter.middleware(
      (httpEffect) =>
        Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => {
          const verdict = checkLocalOnlyRequest({
            host: request.headers.host,
            origin: request.headers.origin,
            trustedOrigins,
          });
          if (verdict.allowed) return httpEffect;
          return Effect.logWarning("Refused a request that was not addressed from localhost.").pipe(
            Effect.annotateLogs({ reason: verdict.reason }),
            Effect.as(forbidden(verdict.reason)),
          );
        }),
      { global: true },
    );
  }),
);
