import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";

import * as ServerConfig from "./config.ts";
import {
  checkLocalOnlyRequest,
  isAllowedOrigin,
  isLoopbackHostHeader,
  layer as localOnlyGuardLayer,
  resolveTrustedOrigins,
} from "./localOnlyGuard.ts";

const desktopOnly = resolveTrustedOrigins({ devUrl: undefined, devAllowedOrigins: [] });

describe("isLoopbackHostHeader", () => {
  it.each([
    "localhost",
    "localhost:3773",
    "LOCALHOST:3773",
    "127.0.0.1",
    "127.0.0.1:3773",
    "[::1]",
    "[::1]:3773",
  ])("accepts %s", (host) => {
    expect(isLoopbackHostHeader(host)).toBe(true);
  });

  it.each([
    undefined,
    "",
    "evil.example",
    "evil.example:3773",
    "localhost.evil.example",
    "127.0.0.1.nip.io",
    "0.0.0.0:3773",
    "192.168.1.20:3773",
    "100.64.0.7:3773",
    "[::]:3773",
    "::1",
    "127.1:3773",
    "2130706433",
    "user@localhost",
    "localhost/evil",
    "my-mac.tailnet.ts.net",
  ])("refuses %s", (host) => {
    expect(isLoopbackHostHeader(host)).toBe(false);
  });
});

describe("isAllowedOrigin", () => {
  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:3773",
    "https://localhost",
    "http://[::1]:3773",
    "t3code://app",
    "t3code-dev://app",
  ])("accepts %s", (origin) => {
    expect(isAllowedOrigin(origin, desktopOnly)).toBe(true);
  });

  it.each([
    "null",
    "https://evil.example",
    "http://localhost.evil.example",
    "http://192.168.1.20:3773",
    "file://",
    "chrome-extension://abcdef",
    "t3code://evil",
  ])("refuses %s", (origin) => {
    expect(isAllowedOrigin(origin, desktopOnly)).toBe(false);
  });

  it("trusts the dev renderer origin only in development", () => {
    const dev = resolveTrustedOrigins({
      devUrl: new URL("http://localhost:5173"),
      devAllowedOrigins: ["https://preview.example.com", "http://127.0.0.1:4000"],
    });
    expect(dev.has("http://127.0.0.1:4000")).toBe(true);
    expect(dev.has("https://preview.example.com")).toBe(false);
  });
});

describe("checkLocalOnlyRequest", () => {
  it("allows a loopback Host with no Origin, as CLI tools and provider agents send", () => {
    expect(
      checkLocalOnlyRequest({
        host: "127.0.0.1:3773",
        origin: undefined,
        trustedOrigins: desktopOnly,
      }),
    ).toEqual({ allowed: true });
  });

  it("refuses a DNS-rebound page even when its Origin matches its Host", () => {
    expect(
      checkLocalOnlyRequest({
        host: "rebind.evil.example:3773",
        origin: "http://rebind.evil.example:3773",
        trustedOrigins: desktopOnly,
      }),
    ).toEqual({ allowed: false, reason: "host" });
  });

  it("refuses another website calling the loopback server", () => {
    expect(
      checkLocalOnlyRequest({
        host: "127.0.0.1:3773",
        origin: "https://evil.example",
        trustedOrigins: desktopOnly,
      }),
    ).toEqual({ allowed: false, reason: "origin" });
  });

  it("allows the desktop app's renderer", () => {
    expect(
      checkLocalOnlyRequest({
        host: "127.0.0.1:3773",
        origin: "t3code://app",
        trustedOrigins: desktopOnly,
      }),
    ).toEqual({ allowed: true });
  });
});

describe("LocalOnlyGuard.layer", () => {
  const handler = () =>
    HttpRouter.toWebHandler(
      HttpRouter.add("GET", "/ping", HttpServerResponse.text("pong")).pipe(
        Layer.provide(localOnlyGuardLayer),
        Layer.provide(
          Layer.succeed(ServerConfig.ServerConfig)({
            devUrl: undefined,
            devAllowedOrigins: [],
          } as unknown as ServerConfig.ServerConfig["Service"]),
        ),
      ),
      { disableLogger: true },
    );

  // A web Request leaves Host to the transport; set it as the browser would have.
  const request = (url: string, headers: Record<string, string> = {}) =>
    new Request(url, { headers: { host: new URL(url).host, ...headers } });

  it.live("serves loopback requests and refuses rebound hosts, foreign origins and upgrades", () =>
    Effect.gen(function* () {
      const { handler: serve, dispose } = handler();
      yield* Effect.addFinalizer(() => Effect.promise(dispose));
      const call = (url: string, headers?: Record<string, string>) =>
        Effect.promise(async () => {
          const response = await serve(request(url, headers));
          return { status: response.status, body: await response.text() };
        });

      expect(yield* call("http://127.0.0.1:3773/ping")).toEqual({ status: 200, body: "pong" });
      expect(
        yield* call("http://localhost:3773/ping", { origin: "http://localhost:5173" }),
      ).toEqual({ status: 200, body: "pong" });
      expect((yield* call("http://127.0.0.1:3773/ping", { origin: "t3code://app" })).status).toBe(
        200,
      );

      expect((yield* call("http://rebind.evil.example:3773/ping")).status).toBe(403);
      expect(
        (yield* call("http://127.0.0.1:3773/ping", { origin: "https://evil.example" })).status,
      ).toBe(403);
      // A cross-site WebSocket handshake is an ordinary GET carrying the page's Origin.
      expect(
        (yield* call("http://127.0.0.1:3773/ping", {
          origin: "https://evil.example",
          connection: "Upgrade",
          upgrade: "websocket",
          "sec-websocket-version": "13",
          "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
        })).status,
      ).toBe(403);
    }).pipe(Effect.scoped),
  );
});
