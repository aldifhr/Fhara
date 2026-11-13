// @effect-diagnostics nodeBuiltinImport:off
import * as NodeModule from "node:module";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { enablePreparedServerCache } from "../../../scripts/lib/server-compile-cache.ts";

// macOS and Windows temp dirs are per user, so they can host the compile cache directly.
try {
  const directory = NodePath.join(NodeOS.tmpdir(), "t3code", "compile-cache");
  const prepared =
    process.env.ELECTRON_RUN_AS_NODE === "1" &&
    enablePreparedServerCache(process.argv[1] ?? "", directory);
  if (!prepared) {
    NodeModule.enableCompileCache(directory);
  }
} catch {}
