import * as NodePlatformCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { authScopeResponse, AuthStandardClientScopes } from "@t3tools/contracts";
import { expect, it } from "@effect/vitest";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import * as ServerConfig from "../config.ts";
import * as ServerEnvironment from "../environment/ServerEnvironment.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as EnvironmentAuth from "./EnvironmentAuth.ts";

import * as ServerSecretStore from "./ServerSecretStore.ts";
import * as SessionStore from "./SessionStore.ts";
import * as ManagedPolicy from "../policy/ManagedPolicy.ts";

const layerServerConfig = ServerConfig.layerTest(process.cwd(), {
  prefix: "t3-auth-server-test-",
});

const layerEnvironmentAuth = EnvironmentAuth.layer.pipe(
  Layer.provide(ManagedPolicy.layerTest()),
  Layer.provideMerge(SqlitePersistence.layerMemory),
  Layer.provide(ServerSecretStore.layer),
  Layer.provide(ServerEnvironment.layerIdentity),
  Layer.provide(layerServerConfig),
);

type AuthRequest = Parameters<
  EnvironmentAuth.EnvironmentAuth["Service"]["authenticateHttpRequest"]
>[0];

const makeRequest = (input: {
  readonly headers?: Record<string, string>;
  readonly cookies?: Record<string, string>;
  readonly url?: string;
}): AuthRequest =>
  ({
    cookies: input.cookies ?? {},
    headers: input.headers ?? {},
    url: input.url ?? "/",
    originalUrl: input.url ?? "/",
  }) as unknown as AuthRequest;

const requestMetadata = {
  deviceType: "desktop" as const,
  os: "macOS",
  browser: "Chrome",
  ipAddress: "127.0.0.1",
};

it.layer(Layer.mergeAll(NodeServices.layer, NodePlatformCrypto.layer))(
  "EnvironmentAuth.layer (app auth disabled)",
  (it) => {
    it.effect("treats a request without credentials as the local owner", () =>
      Effect.gen(function* () {
        const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;
        const session = yield* serverAuth.authenticateHttpRequest(makeRequest({}));

        expect(session).toEqual(EnvironmentAuth.LOCAL_OWNER_SESSION);
        expect(session.scopes).toEqual(AuthStandardClientScopes);
      }).pipe(Effect.provide(layerEnvironmentAuth)),
    );

    it.effect("ignores stale cookies and unknown bearer tokens", () =>
      Effect.gen(function* () {
        const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;
        const sessions = yield* SessionStore.SessionStore;

        const withCookie = yield* serverAuth.authenticateHttpRequest(
          makeRequest({ cookies: { [sessions.cookieName]: "stale-cookie" } }),
        );
        const withBearer = yield* serverAuth.authenticateHttpRequest(
          makeRequest({ headers: { authorization: "Bearer not-a-real-token" } }),
        );

        expect(withCookie.sessionId).toBe(EnvironmentAuth.LOCAL_OWNER_SESSION.sessionId);
        expect(withBearer.sessionId).toBe(EnvironmentAuth.LOCAL_OWNER_SESSION.sessionId);
      }).pipe(Effect.provide(layerEnvironmentAuth)),
    );

    it.effect("reports an authenticated owner session state", () =>
      Effect.gen(function* () {
        const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;
        const state = yield* serverAuth.getSessionState(makeRequest({}));

        expect(state).toMatchObject({
          authenticated: true,
          sessionMethod: "browser-session-cookie",
          ...authScopeResponse(AuthStandardClientScopes),
        });
        expect(state).not.toHaveProperty("expiresAt");
      }).pipe(Effect.provide(layerEnvironmentAuth)),
    );

    it.effect("refuses browser sessions and bootstrap token exchange", () =>
      Effect.gen(function* () {
        const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;

        const browser = yield* serverAuth
          .createBrowserSession("any-credential", requestMetadata)
          .pipe(Effect.flip);
        const token = yield* serverAuth
          .exchangeBootstrapCredentialForAccessToken(
            "desktop-bootstrap-token",
            undefined,
            requestMetadata,
          )
          .pipe(Effect.flip);

        expect(browser._tag).toBe("ServerAuthInvalidCredentialError");
        expect(token._tag).toBe("ServerAuthInvalidCredentialError");
        expect(yield* serverAuth.listSessions()).toEqual([]);
      }).pipe(Effect.provide(layerEnvironmentAuth)),
    );

    it.effect("issues a static WebSocket ticket and accepts upgrades as the owner", () =>
      Effect.gen(function* () {
        const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;

        const rpc = yield* serverAuth.issueWebSocketTicket(EnvironmentAuth.LOCAL_OWNER_SESSION, {
          use: "rpc",
        });
        const media = yield* serverAuth.issueWebSocketTicket(EnvironmentAuth.LOCAL_OWNER_SESSION);
        const upgraded = yield* serverAuth.authenticateWebSocketUpgrade(
          makeRequest({ url: `/ws?wsTicket=${Redacted.value(rpc.ticket)}` }),
          "rpc",
        );

        expect(Redacted.value(rpc.ticket)).toBe(EnvironmentAuth.LOCAL_OWNER_WS_TICKET);
        expect(Redacted.value(media.ticket)).toBe(EnvironmentAuth.LOCAL_OWNER_WS_TICKET);
        expect(rpc.expiresAt.epochMilliseconds).toBeGreaterThan(yield* Clock.currentTimeMillis);
        expect(upgraded).toEqual(EnvironmentAuth.LOCAL_OWNER_SESSION);
      }).pipe(Effect.provide(layerEnvironmentAuth)),
    );

    it.effect("keeps MCP client tokens on /mcp and off the app API", () =>
      Effect.gen(function* () {
        const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;
        const issued = yield* serverAuth.issueMcpClientSession({
          label: "Child thread",
          access: "read-only",
          peerLink: false,
          client: { deviceType: "bot" },
        });
        const request = makeRequest({ headers: { authorization: `Bearer ${issued.token}` } });

        const rejected = yield* serverAuth.authenticateHttpRequest(request).pipe(Effect.flip);
        const mcp = yield* serverAuth.authenticateMcpClient(request);

        expect(rejected._tag).toBe("ServerAuthInvalidCredentialError");
        expect(mcp).toMatchObject({ sessionId: issued.sessionId, access: "read-only" });
      }).pipe(Effect.provide(layerEnvironmentAuth)),
    );

    it.effect("refuses device pairing but mints MCP approval codes, spent once", () =>
      Effect.gen(function* () {
        const serverAuth = yield* EnvironmentAuth.EnvironmentAuth;

        const refused = yield* serverAuth
          .issuePairingCredential({ scopes: ["orchestration:read"] })
          .pipe(Effect.flip);
        const approval = yield* serverAuth.issuePairingCredential({ access: "read-only" });

        const first = yield* serverAuth.consumeMcpApprovalCode(approval.credential, "read-only");
        const reused = yield* serverAuth
          .consumeMcpApprovalCode(approval.credential, "read-only")
          .pipe(Effect.flip);

        expect(refused._tag).toBe("ManagedPolicyRefusedError");
        expect(approval.access).toBe("read-only");
        expect(first).toBe("read-only");
        expect(reused).toMatchObject({
          _tag: "ServerAuthMcpApprovalCodeError",
          reason: "unknown_or_used",
        });
      }).pipe(Effect.provide(layerEnvironmentAuth)),
    );
  },
);
