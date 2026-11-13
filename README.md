<h1 align="center">Fhara</h1>

<p align="center">A personal multi-agent orchestrator, run locally.</p>

Fhara is a personal coding-agent orchestrator (github.com/aldifhr/Fhara). It is a fork of
[T3 Code](https://github.com/pingdotgg/t3code) by T3 Tools Inc. (MIT), trimmed to a lean,
local-only setup and rebranded as Fhara. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## What is in this fork

- **Server and web app only.** The desktop, mobile and marketing apps and the cloud relay were removed.
- **Lean provider set.** Codex, Claude, OpenCode (the default writing engine, pointed at an
  OpenAI-compatible endpoint), Antigravity, and ACP registry agents. Cursor, Grok, fx, Kiro, Pi
  and Muse were removed.
- **GitHub only** for source control. The other forges were removed.
- **No analytics by default** and **no self-update** from upstream T3 Code releases, so an update
  can never replace the fork with the upstream build.

Internal package names (`@t3tools/*`, the `t3` server package) are kept as they are to make
upstream merges easier. Only what the user sees is renamed.

## Run it locally

Requires the Node.js and pnpm versions pinned in `package.json`.

```sh
pnpm install
pnpm dev          # server + web, bound to this machine
```

See the [development runbook](./docs/operations/development.md#first-checkout) and the
[architecture overview](./docs/internals/overview.md). Some docs still describe upstream T3 Code
features that this fork removed.

## License

[MIT](./LICENSE). Copyright (c) 2026 T3 Tools Inc. Modifications by Fhara.
