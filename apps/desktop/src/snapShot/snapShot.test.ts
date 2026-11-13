import { parseKeybindingShortcut } from "@t3tools/shared/keybindings";
import { describe, expect, it } from "vite-plus/test";

import {
  accessibleWindowElementTree,
  accessibleWindowText,
  compactAccessibilityTree,
  findAccessibleWindow,
  toElectronAccelerator,
} from "./snapShot.ts";

describe("accessibleWindowText", () => {
  it("caps large text without splitting a surrogate pair", () => {
    expect(
      accessibleWindowText(
        {
          value: "abcðŸ˜€def",
          children: [],
        },
        5,
      ),
    ).toBe("abcðŸ˜€");
  });

  it("stops traversing very large trees", () => {
    expect(
      accessibleWindowText(
        {
          children: [
            ...Array.from({ length: 10_000 }, () => ({ children: [] })),
            { value: "past node limit", children: [] },
          ],
        },
        100,
      ),
    ).not.toContain("past node limit");
  });
});

describe("accessibleWindowElementTree", () => {
  it("maps element bounds into captured-image pixels and keeps semantic state", async () => {
    const tree = await accessibleWindowElementTree(
      {
        role: "window",
        name: "Editor",
        bounds: { x: 100, y: 200, width: 800, height: 600 },
        active: true,
        children: async () => [
          {
            role: "button",
            name: "Save",
            description: "Save the document",
            bounds: { x: 300, y: 350, width: 100, height: 50 },
            focused: true,
            actions: ["press", "press"],
            children: async () => [],
          },
        ],
      },
      { x: 100, y: 200, width: 800, height: 600 },
      { width: 1_600, height: 1_200 },
    );

    expect(tree).toEqual({
      truncated: false,
      root: {
        role: "window",
        name: "Editor",
        bounds: { x: 0, y: 0, width: 1_600, height: 1_200 },
        state: { active: true },
        children: [
          {
            role: "button",
            name: "Save",
            description: "Save the document",
            bounds: { x: 400, y: 300, width: 200, height: 100 },
            state: { focused: true },
            actions: ["press"],
            children: [],
          },
        ],
      },
    });
  });

  it("collapses anonymous wrapper chains and removes duplicate text fields", async () => {
    const tree = await accessibleWindowElementTree(
      {
        role: "window",
        name: "Editor",
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        children: async () => [
          {
            role: "group",
            bounds: { x: 0, y: 0, width: 800, height: 600 },
            children: async () => [
              {
                role: "group",
                bounds: { x: 0, y: 0, width: 800, height: 600 },
                children: async () => [
                  {
                    role: "button",
                    name: "Save",
                    value: "Save",
                    description: "Save",
                    bounds: { x: 20, y: 30, width: 80, height: 24 },
                    actions: ["press"],
                    children: async () => [],
                  },
                  {
                    role: "group",
                    bounds: null,
                    children: async () => [],
                  },
                ],
              },
            ],
          },
        ],
      },
      { x: 0, y: 0, width: 800, height: 600 },
      { width: 800, height: 600 },
    );

    expect(tree?.root.children).toEqual([
      {
        role: "button",
        name: "Save",
        bounds: { x: 20, y: 30, width: 80, height: 24 },
        actions: ["press"],
        children: [],
      },
    ]);
  });

  it("marks trees truncated before their serialized payload grows without bound", async () => {
    const tree = await accessibleWindowElementTree(
      {
        role: "window",
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        children: async () =>
          Array.from({ length: 10 }, (_, index) => ({
            role: "text",
            value: `${index}${"x".repeat(8_000)}`,
            bounds: null,
            children: async () => [],
          })),
      },
      { x: 0, y: 0, width: 800, height: 600 },
      { width: 800, height: 600 },
    );

    expect(tree?.truncated).toBe(true);
    expect(tree?.root.children.length).toBeLessThan(10);
    expect(JSON.stringify(tree).length).toBeLessThanOrEqual(32_000);
  });
});

describe("compactAccessibilityTree", () => {
  it("keeps anonymous groups that organize multiple semantic children", () => {
    const compacted = compactAccessibilityTree({
      role: "window",
      bounds: { x: 0, y: 0, width: 800, height: 600 },
      children: [
        {
          role: "group",
          bounds: { x: 0, y: 0, width: 800, height: 100 },
          children: [
            { role: "button", name: "Back", bounds: null, children: [] },
            { role: "button", name: "Forward", bounds: null, children: [] },
          ],
        },
      ],
    });

    expect(compacted.root.children[0]?.role).toBe("group");
    expect(compacted.root.children[0]?.children).toHaveLength(2);
  });
});

describe("findAccessibleWindow", () => {
  const captured = {
    title: "Editor",
    bounds: { x: 100, y: 200, width: 800, height: 600 },
  };

  const chromeCapture = {
    title: "Issues Â· pingdotgg/t3code",
    bounds: captured.bounds,
    platform: "darwin" as const,
    bundleId: "com.google.Chrome",
  };
  const chromeWindow = {
    name: `${chromeCapture.title} - Google Chrome â€“ Profile`,
    bounds: chromeCapture.bounds,
    active: true,
  };

  it("uses a browser suffix only when no exact title matches", () => {
    const exact = { name: chromeCapture.title, bounds: chromeCapture.bounds };
    expect(findAccessibleWindow([chromeWindow, exact], chromeCapture)).toBe(exact);
    expect(findAccessibleWindow([chromeWindow], chromeCapture)).toBe(chromeWindow);
  });

  it("rejects browser suffix matches with wrong bounds, page titles, or ambiguous windows", () => {
    expect(
      findAccessibleWindow(
        [{ ...chromeWindow, bounds: { ...chromeWindow.bounds, x: 0 } }],
        chromeCapture,
      ),
    ).toBeUndefined();
    expect(
      findAccessibleWindow([chromeWindow, { ...chromeWindow, active: false }], chromeCapture),
    ).toBeUndefined();
    expect(
      findAccessibleWindow([chromeWindow], { ...chromeCapture, title: "Issues" }),
    ).toBeUndefined();
    expect(
      findAccessibleWindow([chromeWindow], {
        ...chromeCapture,
        title: `${chromeCapture.title} - Google Chrome`,
      }),
    ).toBeUndefined();
  });

  it("keeps strict titles outside macOS Chrome and Chromium", () => {
    for (const identity of [
      { platform: "android" as const, bundleId: "com.google.Chrome" },
      { platform: "win32" as const, bundleId: "com.google.Chrome" },
      { platform: "darwin" as const, bundleId: "com.example.Editor" },
      { platform: "darwin" as const, bundleId: undefined },
    ]) {
      expect(
        findAccessibleWindow([chromeWindow], { ...chromeCapture, ...identity }),
      ).toBeUndefined();
    }
  });

  it("matches one window by its captured bounds", () => {
    const windows = [
      { name: "Private", bounds: { x: 0, y: 0, width: 400, height: 300 } },
      { name: "Editor", bounds: { x: 101, y: 199, width: 800, height: 601 } },
    ];

    expect(findAccessibleWindow(windows, captured)).toBe(windows[1]);
  });

  it("uses the captured source title when the active title changed", () => {
    const windows = [{ name: "Editor â€” saved", bounds: captured.bounds }];

    expect(
      findAccessibleWindow(windows, {
        ...captured,
        title: "Editor â€” saving",
        sourceTitle: "Editor â€” saved",
      }),
    ).toBe(windows[0]);
  });

  it("uses the active match to disambiguate equal windows", () => {
    const windows = [
      { name: "Editor", bounds: captured.bounds, active: false },
      { name: "Editor", bounds: captured.bounds, active: true },
    ];

    expect(findAccessibleWindow(windows, captured)).toBe(windows[1]);
  });

  it("does not match equal bounds with a different title", () => {
    expect(
      findAccessibleWindow(
        [{ name: "Private", bounds: { x: 100, y: 200, width: 800, height: 600 } }],
        captured,
      ),
    ).toBeUndefined();
  });

  it("accepts one PID-scoped untitled window whose bounds match", () => {
    const windows = [{ name: null, bounds: captured.bounds }];

    expect(findAccessibleWindow(windows, captured, { allowUntitledUniqueBounds: true })).toBe(
      windows[0],
    );
    expect(findAccessibleWindow(windows, captured)).toBeUndefined();
  });

  it("does not fall back to a differently titled PID-scoped window with matching bounds", () => {
    const windows = [{ name: "Preferences", bounds: captured.bounds }];

    expect(
      findAccessibleWindow(windows, captured, { allowUntitledUniqueBounds: true }),
    ).toBeUndefined();
  });

  it("does not use unique bounds when a titled match is already ambiguous", () => {
    const windows = [
      { name: "Editor", bounds: captured.bounds },
      { name: "Editor", bounds: { ...captured.bounds, x: 0, y: 0 } },
    ];

    expect(
      findAccessibleWindow(windows, captured, { allowUntitledUniqueBounds: true }),
    ).toBeUndefined();
  });
});
describe("toElectronAccelerator", () => {
  // The settings recorder stores shortcuts through parseKeybindingShortcut, which lowercases keys.
  it.each([
    ["mod+shift+arrowup", "CommandOrControl+Shift+Up"],
    ["mod+shift+arrowdown", "CommandOrControl+Shift+Down"],
    ["ctrl+alt+arrowleft", "Control+Alt+Left"],
    ["ctrl+alt+arrowright", "Control+Alt+Right"],
    ["mod+shift+esc", "CommandOrControl+Shift+Esc"],
    ["mod+shift+space", "CommandOrControl+Shift+Space"],
    ["mod+shift+2", "CommandOrControl+Shift+2"],
  ])("maps a recorded %s to an Electron accelerator", (recorded, accelerator) => {
    expect(toElectronAccelerator(parseKeybindingShortcut(recorded)!)).toBe(accelerator);
  });
});
