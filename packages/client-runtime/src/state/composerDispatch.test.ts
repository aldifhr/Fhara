import { expect, it } from "vite-plus/test";

import {
  alternateComposerDispatchAction,
  compactionBlocksSteering,
  resolveComposerDispatchMode,
} from "./composerDispatch.ts";

it("blocks steering for explicit compaction, and for automatic compaction unless the provider takes steers then", () => {
  const during = (
    text: string | undefined,
    attachments: ReadonlyArray<unknown> = [],
    steersDuringCompaction = true,
  ) =>
    compactionBlocksSteering({
      compactCommandIsActive: false,
      compactionRunning: true,
      steersDuringCompaction,
      run: { userMessageId: "user" },
      messages: [
        ...(text === undefined ? [] : [{ id: "user", text, attachments }]),
        { id: "later", text: "/compact" },
      ],
    });

  for (const text of ["/compact", "  /COMPACT  ", "/compact keep the debugging notes"]) {
    expect(during(text)).toBe(true);
  }
  for (const text of ["Read the code", "/compactify", "please /compact", undefined]) {
    expect(during(text)).toBe(false);
  }
  expect(during("/compact", [{}])).toBe(false);
  expect(during("Read the code", [], false)).toBe(true);

  expect(
    compactionBlocksSteering({
      compactCommandIsActive: true,
      compactionRunning: false,
      steersDuringCompaction: true,
      run: undefined,
      messages: undefined,
    }),
  ).toBe(true);
  expect(
    compactionBlocksSteering({
      compactCommandIsActive: false,
      compactionRunning: false,
      steersDuringCompaction: false,
      run: { userMessageId: "user" },
      messages: [{ id: "user", text: "/compact" }],
    }),
  ).toBe(false);
});

it("queues a follow-up sent while a turn runs by default, and steers only when asked", () => {
  expect(resolveComposerDispatchMode({ running: false, alternateModifier: false })).toBe("auto");
  expect(resolveComposerDispatchMode({ running: true, alternateModifier: false })).toBe("queue");
  expect(resolveComposerDispatchMode({ running: true, alternateModifier: true })).toBe("steer");
  expect(alternateComposerDispatchAction()).toBe("steer");
  expect(
    resolveComposerDispatchMode({
      running: true,
      alternateModifier: false,
      activeTurnDefault: "steer",
    }),
  ).toBe("steer");
  // A turn that cannot take steering input always queues.
  expect(
    resolveComposerDispatchMode({
      running: true,
      alternateModifier: true,
      activeTurnDefault: "steer",
      canSteer: false,
    }),
  ).toBe("queue");
});
