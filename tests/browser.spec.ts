import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { Page, TestInfo } from "@playwright/test";
import type { Action, RoomId } from "../src/game/rules.ts";
import { solution, fullSolution, bodySolution, moduleSolution, freightSetup, freightSolution, routesSolution } from "./solution.ts";

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
});
test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page)).toEqual([]); });

const keyFor = (action: Action): string =>
  action.type === "move" || action.type === "pull"
    ? {
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
      }[action.direction]
    : { switch: "Shift", swap: "t", interact: "e" }[action.type];
async function keys(page: Page, actions: Action[]): Promise<void> {
  for (const action of actions) {
    if (action.type === "pull") await page.keyboard.down("e");
    await page.keyboard.press(keyFor(action));
    if (action.type === "pull") await page.keyboard.up("e");
    await expect(page.locator("#game")).toHaveAttribute("data-animating", "false");
  }
}
async function ready(page: Page, room: RoomId = "tech"): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#game")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("canvas")).toBeVisible();
  await page.locator("#room-select").selectOption(room);
}

test("real keyboard solution, persistent power on Shift, exact full undo and restart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await ready(page);
  await page.screenshot({
    path: ".cache/technikraum-start.png",
    fullPage: true,
  });
  await keys(page, solution.swapAndPower);
  await page.screenshot({ path: ".cache/technikraum-module-getauscht.png", fullPage: true });
  await expect(page.getByTestId("robot-pip")).toHaveAttribute(
    "data-module",
    "power",
  );
  await expect(page.locator("#door-status")).toContainText("Strom verbunden");
  await page.keyboard.press("Shift");
  await expect(page.getByTestId("robot-bolt")).toHaveClass(/active/);
  await expect(page.locator("#door-status")).toContainText("Strom verbunden");
  await keys(page, solution.boltToPlate.slice(1));
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "8");
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-y", "7");
  await keys(page, solution.pipToExit);
  await expect(page.locator("#door-status")).toContainText(
    "Bolt hält die Platte",
  );
  await keys(page, solution.boltToExit);
  await expect(page.locator("#feedback")).toContainText("Geschafft!");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "14");
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "15");
  await expect(page.locator("#door-status")).toContainText("A ZU");
  await page.screenshot({
    path: ".cache/technikraum-geloest.png",
    fullPage: true,
  });
  for (let i = 0; i < fullSolution.length; i++) await page.keyboard.press("z");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute(
    "data-module",
    "magnet",
  );
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "3");
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "4");
  await page.keyboard.press("d"); // WASD and R
  await page.keyboard.press("r");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "3");
  expect(errors).toEqual([]);
});

test("buttons, focus recovery, stale OS repeat and narrow viewport", async ({
  page,
}) => {
  await ready(page, "modules");
  await page.keyboard.press("d");
  await expect(page.locator("#game")).toHaveAttribute("data-animating", "false");
  // A stale OS repeat after keyup must neither add a move nor restart holding.
  await page.locator("#game").dispatchEvent("keydown", { code: "KeyD", repeat: true, bubbles: true });
  await page.waitForTimeout(220);
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "4");
  await page.getByRole("button", { name: "T · Module tauschen" }).click();
  await expect(page.getByTestId("robot-pip")).toHaveAttribute(
    "data-module",
    "power",
  );
  await page.getByRole("button", { name: "Z · Undo" }).click();
  await expect(page.getByTestId("robot-pip")).toHaveAttribute(
    "data-module",
    "magnet",
  );
  await page.getByRole("button", { name: "E · Interagieren" }).click();
  await expect(page.locator("#feedback")).toContainText(
    "Magnet bereit",
  );
  await page.getByRole("button", { name: "R · Neustart" }).click();
  await expect(page.locator("#undo")).toBeDisabled();
  await page.getByRole("heading", { name: "Shift Buddies" }).click();
  await page.locator("canvas").click();
  await page.keyboard.press("d");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "4");
  await page.setViewportSize({ width: 800, height: 1000 });
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});


test("first entry, two short lessons, next, room-local undo and direct test room selection", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto("/");
  await expect(page.locator("#game")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("#game")).toHaveAttribute("data-room", "bodies");
  const switchButton = page.getByRole("button", { name: "Shift · Roboter wechseln" });
  await switchButton.click();
  await expect(page.getByTestId("robot-bolt")).toHaveClass(/active/);
  await expect(page.locator("#game")).toBeFocused();
  await page.keyboard.press("ShiftRight");
  await expect(page.getByTestId("robot-pip")).toHaveClass(/active/);
  await page.getByRole("button", { name: "R · Neustart" }).click();
  await page.screenshot({ path: ".cache/lernraum-koerper-start.png", fullPage: true });
  await keys(page, bodySolution);
  await expect(page.locator("#feedback")).toContainText("Geschafft!");
  await expect(page.locator("#door-status")).toContainText("Bolt hält die Platte");
  await page.screenshot({ path: ".cache/lernraum-koerper-geloest.png", fullPage: true });
  await page.keyboard.press("z");
  await expect(page.locator("#next-room")).toBeHidden();
  await keys(page, bodySolution.slice(-1));
  await page.getByRole("button", { name: "Weiter zum nächsten Raum" }).click();
  await expect(page.locator("#game")).toBeFocused();
  await expect(page.locator("#game")).toHaveAttribute("data-room", "modules");
  await expect(page.locator("#undo")).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "E · Interagieren" }).click();
  await expect(page.locator("#feedback")).toContainText("verankert und nicht magnetisch");
  await page.screenshot({ path: ".cache/lernraum-module-hindernis.png", fullPage: true });
  await page.keyboard.press("r");
  // Click equivalents for every module exchange, interaction and robot switch.
  for (const action of moduleSolution) {
    if (action.type === "move" || action.type === "pull") await keys(page, [action]);
    else {
      await page.locator(`#${action.type}`).click();
      await expect(page.locator("#game")).toBeFocused();
      if (action.type === "swap") {
        await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-module", "power");
        await page.waitForTimeout(500);
        await page.screenshot({ path: ".cache/lernraum-module-getauscht.png", fullPage: true });
      }
    }
  }
  await expect(page.locator("#feedback")).toContainText("Geschafft!");
  await page.screenshot({ path: ".cache/lernraum-module-geloest.png", fullPage: true });
  for (let i = 0; i < moduleSolution.length; i++) await page.keyboard.press("z");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "3");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-y", "5");
  await keys(page, moduleSolution);
  await page.locator("#next-room").click();
  await expect(page.locator("#game")).toHaveAttribute("data-room", "tech");
  await expect(page.locator("#next-room")).toBeHidden();
  await expect(page.locator("#undo")).toBeDisabled();
  // Switching away and back starts a clean room; undo never leaks across rooms.
  await page.keyboard.press("d");
  await page.locator("#room-select").selectOption("bodies");
  await page.locator("#room-select").selectOption("tech");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "3");
  await expect(page.locator("#undo")).toBeDisabled();
  expect(errors).toEqual([]);
});

// These routes go through DOM keyboard events, never through a debug state setter.
test("six rooms in order, Enter once with button focus/repeat, full undo and final ending", async ({ page }) => {
  test.setTimeout(180_000);
  const { allSolutions } = await import("./solution.ts");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto("/");
  await expect(page.locator("#game")).toHaveAttribute("data-ready", "true");
  await page.keyboard.press("Enter");
  await expect(page.locator("#game")).toHaveAttribute("data-room", "bodies");
  const rooms = Object.entries(allSolutions);
  for (let i = 0; i < rooms.length; i++) {
    const [room, actions] = rooms[i];
    await expect(page.locator("#game")).toHaveAttribute("data-room", room);
    await keys(page, actions);
    await expect(page.locator("#game")).toHaveAttribute("data-won", "true");
    await expect(page.locator("#move-count")).toHaveText(`${actions.length} Aktionen`);
    await page.screenshot({ path: `.cache/expansion-${room}-won.png`, fullPage: true });
    for (let n = 0; n < actions.length; n++) await page.keyboard.press("z");
    await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
    await expect(page.locator("#undo")).toBeDisabled();
    // Replay without motion to also verify reduced-motion solutions.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await keys(page, actions);
    if (i < rooms.length - 1) {
      await expect(page.locator("#objective")).toContainText("Enter");
      await page.locator("#next-room").focus();
      await page.keyboard.down("Enter");
      await page.keyboard.down("Enter"); // actual repeated keydown
      await page.keyboard.up("Enter");
      await expect(page.locator("#game")).toHaveAttribute("data-room", rooms[i + 1][0]);
      await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
      await expect(page.locator("#game")).toBeFocused();
    } else {
      await expect(page.locator("#next-room")).toBeHidden();
      await expect(page.locator("#objective")).toContainText("Alle sechs Räume geschafft");
      await page.keyboard.press("Enter");
      await expect(page.locator("#game")).toHaveAttribute("data-room", "bridge");
      await expect(page.locator("#game")).toHaveAttribute("data-won", "true");
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  expect(errors).toEqual([]);
});

test("held E pull: no forward/lateral turn, repeat, release, blur, obstruction and resets", async ({ page }) => {
  await ready(page, "modules");
  await keys(page, moduleSolution.slice(0, 5)); // Pip 5/2 facing right
  const game = page.locator("#game"), pip = page.getByTestId("robot-pip");
  const count = await page.locator("#move-count").textContent();
  await page.keyboard.press("e");
  await expect(game).toHaveAttribute("data-crate", "6,2");
  await expect(page.locator("#move-count")).toHaveText(count!);
  await page.keyboard.down("e");
  await expect(game).toHaveAttribute("data-pulling", "true");
  for (const key of ["ArrowUp", "ArrowDown", "ArrowRight"]) await page.keyboard.press(key);
  await expect(pip).toHaveAttribute("data-facing", "right");
  await expect(pip).toHaveAttribute("data-x", "5");
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("ArrowLeft"); // repeat must not pull twice
  await page.keyboard.up("ArrowLeft");
  await expect(pip).toHaveAttribute("data-x", "4");
  await expect(game).toHaveAttribute("data-crate", "5,2");
  await expect(pip).toHaveAttribute("data-facing", "right");
  await expect(game).toHaveAttribute("data-animating", "false");
  await page.screenshot({ path: ".cache/expansion-magnet-link.png", fullPage: true });
  await page.keyboard.up("e");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.press("ArrowDown");
  await expect(pip).toHaveAttribute("data-y", "3");
  await expect(game).toHaveAttribute("data-animating", "true");
  await page.keyboard.press("z");
  await expect(game).toHaveAttribute("data-animating", "false");
  await expect(pip).toHaveAttribute("data-y", "2");
  for (const key of ["Shift", "z", "r"]) {
    await page.keyboard.down("e");
    await page.keyboard.press(key);
    await expect(game).toHaveAttribute("data-pulling", "false");
    await page.keyboard.up("e");
  }
  await page.keyboard.press("r");
  await page.keyboard.press("d"); // beside Bolt at 4/6
  await page.keyboard.down("e");
  await page.keyboard.press("t");
  await expect(pip).toHaveAttribute("data-module", "power");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await page.keyboard.press("z");
  await page.keyboard.down("e");
  await page.locator("#room-select").selectOption("modules");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await page.keyboard.down("e");
  await page.locator("#room-select").focus();
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await game.focus();
  await page.keyboard.down("e");
  // Explicit DOM event; headless windows do not reproduce physical OS focus.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await page.keyboard.press("ArrowRight");
  await expect(pip).toHaveAttribute("data-x", "4");
  await page.keyboard.press("r");
  await keys(page, moduleSolution.slice(0, 5));
  await page.keyboard.down("e");
  for (let n = 0; n < 3; n++) {
    await page.keyboard.press("ArrowLeft");
    await expect(game).toHaveAttribute("data-animating", "false");
  }
  await expect(pip).toHaveAttribute("data-x", "3");
  await expect(game).toHaveAttribute("data-crate", "4,2");
  await expect(page.locator("#feedback")).toContainText("Kein Platz");
  await page.keyboard.up("e");
});

test("Bolt pushes with either module, never E alone or normal driving; undo and E release", async ({ page }) => {
  await ready(page, "freight");
  await keys(page, freightSetup);
  const game = page.locator("#game"), bolt = page.getByTestId("robot-bolt");
  await expect(bolt).toHaveAttribute("data-module", "magnet");
  await expect(bolt).toHaveAttribute("data-facing", "down");
  for (const key of ["ArrowDown", "e"]) await page.keyboard.press(key);
  await expect(game).toHaveAttribute("data-crate", "5,3");
  await page.keyboard.down("e");
  await page.keyboard.press("ArrowRight");
  await expect(bolt).toHaveAttribute("data-facing", "down");
  await page.keyboard.down("ArrowDown");
  await page.keyboard.down("ArrowDown");
  await page.keyboard.up("ArrowDown");
  await expect(game).toHaveAttribute("data-crate", "5,4");
  await expect(bolt).toHaveAttribute("data-y", "3");
  await expect(game).toHaveAttribute("data-animating", "false");
  await page.keyboard.press("ArrowDown"); // wall behind crate
  await expect(game).toHaveAttribute("data-crate", "5,4");
  await page.keyboard.up("e");
  await page.keyboard.press("z");
  await expect(game).toHaveAttribute("data-crate", "5,3");
  await expect(bolt).toHaveAttribute("data-y", "2");
  await page.screenshot({ path: ".cache/cooperation-push.png", fullPage: true });
  // Alternate room-5 solution: after the second T, Bolt carries battery.
  await page.locator("#room-select").selectOption("routes");
  const swap = routesSolution.map(a => a.type).lastIndexOf("swap");
  await keys(page, routesSolution.slice(0, swap + 1));
  await keys(page, [{ type: "switch" }, { type: "move", direction: "up" },
    { type: "move", direction: "up" }, { type: "move", direction: "right" },
    { type: "move", direction: "down" }]);
  await expect(bolt).toHaveAttribute("data-module", "power");
  await page.keyboard.press("e");
  await expect(game).toHaveAttribute("data-crate", "9,6");
  await keys(page, [{ type: "pull", direction: "down" }]);
  await expect(game).toHaveAttribute("data-crate", "9,7");
  await expect(bolt).toHaveAttribute("data-y", "6");
  await expect(bolt).toHaveAttribute("data-module", "power");
  await page.screenshot({ path: ".cache/cooperation-battery-push.png", fullPage: true });
});

test("in-flight Shift/restart/room, rotation views, supplied and occupied bridge, audio opt-in", async ({ page }) => {
  await ready(page, "modules");
  const game = page.locator("#game");
  for (const [key, facing] of [["ArrowRight", "right"], ["ArrowUp", "up"], ["ArrowLeft", "left"], ["ArrowDown", "down"]]) {
    await page.keyboard.press(key);
    await expect(game).toHaveAttribute("data-animating", "false");
    await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-facing", facing);
    await page.screenshot({ path: `.cache/expansion-facing-${facing}.png`, fullPage: true });
  }
  await page.keyboard.press("r");
  await page.keyboard.press("d");
  await expect(game).toHaveAttribute("data-animating", "true");
  await page.keyboard.press("Shift");
  await expect(game).toHaveAttribute("data-animating", "false");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "4");
  await page.keyboard.press("z");
  await page.keyboard.press("w");
  await page.keyboard.press("r");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
  await page.keyboard.press("d");
  await page.locator("#room-select").selectOption("bridge");
  await expect(game).toHaveAttribute("data-animating", "false");
  const { bridgeSolution } = await import("./solution.ts");
  await keys(page, bridgeSolution.slice(0, 10)); // Bolt just on bridge at 7/5
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "7");
  await page.screenshot({ path: ".cache/expansion-bridge-powered.png", fullPage: true });
  await page.keyboard.press("Shift");
  await page.keyboard.press("e"); // supplier disconnects while Bolt occupies span
  await expect(page.locator("#door-status")).toContainText("BESETZT · SICHER");
  await page.screenshot({ path: ".cache/expansion-bridge-occupied.png", fullPage: true });
  await page.keyboard.press("Shift");
  await keys(page, [{ type: "move", direction: "right" }]);
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "8");
  await expect(page.locator("#door-status")).toContainText("C ZU");
  await page.screenshot({ path: ".cache/expansion-bridge-retracted.png", fullPage: true });
  await page.locator("#room-select").selectOption("modules");
  await keys(page, moduleSolution.slice(0, 5));
  await expect(page.locator("#mute")).toHaveText("Ton: aus");
  await page.locator("#mute").click();
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "true");
  await keys(page, [{ type: "pull", direction: "left" }]);
  await page.locator("#mute").click();
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "false");
});

// Check the rendered face, not just a direction attribute. The two pale eyes
// must remain visible at the chassis front under both screen-upright modules.
test("both modules leave both robots' eyes readable in all four directions", async ({ page }) => {
  await ready(page, "modules");
  const failures: string[] = [];
  const directions = [["ArrowRight", "right", 1, 0], ["ArrowUp", "up", 0, -1],
    ["ArrowLeft", "left", -1, 0], ["ArrowDown", "down", 0, 1]] as const;
  for (const distribution of ["initial", "swapped"] as const) {
    if (distribution === "swapped") {
      await page.keyboard.press("Shift"); // back to Pip
      await keys(page, [{ type: "move", direction: "right" }, { type: "swap" }]);
    }
    for (const id of ["pip", "bolt"] as const) {
      if (id === "bolt") await page.keyboard.press("Shift");
      const card = page.getByTestId(`robot-${id}`);
      for (const [key, direction, dx, dy] of directions) {
        await page.keyboard.press(key);
        await expect(page.locator("#game")).toHaveAttribute("data-animating", "false");
        await expect(card).toHaveAttribute("data-facing", direction);
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
        await page.waitForTimeout(200); // inspect the settled face after the stop reaction
        const cx = Number(await card.getAttribute("data-x")) * 50 + 25;
        const cy = Number(await card.getAttribute("data-y")) * 50 + 25;
        const eyes = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement, { cx, cy, dx, dy }) => {
          const context = canvas.getContext("2d")!;
          return [-3.5, 3.5].map(side => {
            const x = Math.round(cx + dx * 10 - dy * side);
            const y = Math.round(cy + dy * 10 + dx * side);
            const pixels = context.getImageData(x - 1, y - 1, 3, 3).data;
            let visible = 0;
            for (let i = 0; i < pixels.length; i += 4)
              if (pixels[i] > 225 && pixels[i + 1] > 230 && pixels[i + 2] > 230) visible++;
            return visible;
          });
        }, { cx, cy, dx, dy });
        const module = await card.getAttribute("data-module");
        if (eyes.some(count => count < 4)) failures.push(`${id}/${module}/${direction}: eye pixels ${eyes}`);
        await page.locator("canvas").screenshot({ path: `.cache/review-facing-2026-11-02/${id}-${module}-${direction}.png` });
      }
    }
  }
  expect(failures, "Each eye should retain its bright core within the 3×3 sample").toEqual([]);
});

// rAF samples of the coordinates actually passed to the shared canvas renderer,
// plus canvas pixels. These prove progression between centres, not just a HUD end state.
async function recordFrames(page: Page, milliseconds: number, captureCanvas = false,
  region = { x: 140, y: 90, width: 250, height: 310, stride: 64 }): Promise<void> {
  await page.evaluate(({ duration, captureCanvas, region }) => {
    const target = window as unknown as { driveFrames: unknown[]; driveRecording: boolean };
    target.driveFrames = []; target.driveRecording = true;
    const start = performance.now();
    function sample() {
      const game = document.querySelector<HTMLElement>("#game")!;
      const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
      const data = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(region.x, region.y, region.width, region.height).data;
      let hash = 2166136261;
      for (let i = 0; i < data.length; i += region.stride) hash = Math.imul(hash ^ data[i], 16777619);
      target.driveFrames.push({ t: performance.now(), pip: JSON.parse(game.dataset.visualPip!),
        bolt: JSON.parse(game.dataset.visualBolt!), crate: game.dataset.visualCrate ? JSON.parse(game.dataset.visualCrate) : null,
        magnet: JSON.parse(game.dataset.visualMagnet!), power: JSON.parse(game.dataset.visualPower!),
        celebrating: game.dataset.celebrating === "true", handoff: game.dataset.handoff === "true", png: captureCanvas ? canvas.toDataURL("image/png") : undefined,
        hash: hash >>> 0, actions: document.querySelector("#move-count")!.textContent });
      if (performance.now() - start < duration) requestAnimationFrame(sample);
      else target.driveRecording = false;
    }
    requestAnimationFrame(sample);
  }, { duration: milliseconds, captureCanvas, region });
}
async function frames(page: Page) {
  await page.waitForFunction(() => !(window as unknown as { driveRecording: boolean }).driveRecording);
  return page.evaluate(() => (window as unknown as { driveFrames: {
    t: number; pip: { x: number; y: number; angle: number; leftPhase: number; rightPhase: number; wave: number; nod: number };
    bolt: { x: number; y: number; angle: number; leftPhase: number; rightPhase: number; wave: number; nod: number };
    magnet: { x: number; y: number }; power: { x: number; y: number }; celebrating: boolean; handoff: boolean; png?: string;
    crate: { x: number; y: number } | null; hash: number; actions: string;
  }[] }).driveFrames);
}

async function attachEvidence(info: TestInfo, name: string, samples: unknown): Promise<void> {
  const path = info.outputPath(name);
  await writeFile(path, JSON.stringify(samples, null, 2));
  await info.attach(name, { path, contentType: "application/json" });
}

test("module handoff: both physical shapes cross distinct arcs over real canvas frames and dock", async ({ page }, info) => {
  await ready(page, "freight"); // Adjacent bots, both initially facing up.
  const game = page.locator("#game");
  await recordFrames(page, 650, true);
  await page.waitForTimeout(50); // Include the old docked modules in the evidence.
  await page.keyboard.press("t");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-module", "power");
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-module", "magnet");
  const samples = await frames(page);
  const flying = samples.filter(f => f.handoff);
  const first = samples[0], last = samples.at(-1)!;
  expect(first.handoff).toBe(false);
  expect(last.handoff).toBe(false);
  expect(flying.length).toBeGreaterThan(8);
  expect(new Set(flying.map(f => f.hash)).size).toBeGreaterThan(6);
  expect(flying.some(f => f.magnet.x > 185 && f.magnet.x < 215 && f.magnet.y > first.magnet.y + 15)).toBe(true);
  expect(flying.some(f => f.power.x > 185 && f.power.x < 215 && f.power.y < first.power.y - 15)).toBe(true);
  for (const f of flying) expect(Math.hypot(f.magnet.x - f.power.x, f.magnet.y - f.power.y)).toBeGreaterThan(30);
  expect(last.magnet).toEqual(first.power);
  expect(last.power).toEqual(first.magnet);
  await attachEvidence(info, "handoff-canvas-frames.json", samples.map(({ png, ...frame }) => frame));
  // Preserve actual renderer output at start, three interior frames and finish.
  const selected = [first, ...[0.2, 0.5, 0.8].map(t => flying[Math.floor((flying.length - 1) * t)]), last];
  for (const [index, frame] of selected.entries()) {
    const path = info.outputPath(`handoff-${index}.png`);
    await writeFile(path, Buffer.from(frame.png!.split(",")[1], "base64"));
    await info.attach(`handoff-${index}`, { path, contentType: "image/png" });
  }
  await page.keyboard.press("z");
  await expect(game).toHaveAttribute("data-handoff", "false");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-module", "magnet");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
});

test("handoff interrupts: undo, restart, switch, another swap, movement, interaction, room and focus", async ({ page }) => {
  await ready(page, "freight");
  const game = page.locator("#game"), pip = page.getByTestId("robot-pip"), bolt = page.getByTestId("robot-bolt");
  for (const action of ["undo", "restart", "switch", "swap", "move", "interact", "room", "blur", "hidden", "pause"] as const) {
    await page.locator("#room-select").selectOption("freight");
    // Same task dispatches genuine DOM input in order, before a rendered frame
    // can finish the handoff. No game-state setter or animation clock override.
    const during = await game.evaluate((field, action) => {
      const press = (code: string) => {
        field.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
        field.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
      };
      press("KeyT");
      const started = (field as HTMLElement).dataset.handoff;
      if (action === "room") {
        const select = document.querySelector<HTMLSelectElement>("#room-select")!;
        select.value = "bodies"; select.dispatchEvent(new Event("change"));
      } else if (action === "blur") window.dispatchEvent(new Event("blur"));
      else if (action === "hidden") {
        Object.defineProperty(document, "hidden", { configurable: true, value: true });
        document.dispatchEvent(new Event("visibilitychange"));
        delete (document as unknown as { hidden?: boolean }).hidden;
      } else if (action === "pause") {
        // Reproduce a suspended frame, matching the existing drive regression.
        const until = performance.now() + 280;
        while (performance.now() < until) { /* main thread suspended */ }
      } else press({ undo: "KeyZ", restart: "KeyR", switch: "ShiftLeft", swap: "KeyT", move: "KeyW", interact: "KeyE" }[action]);
      return { started, after: (field as HTMLElement).dataset.handoff };
    }, action);
    expect(during.started, action).toBe("true");
    if (action !== "swap" && action !== "pause") expect(during.after, action).toBe("false");
    if (action === "swap") expect(during.after).toBe("true");
    if (action === "move") {
      await expect(pip).toHaveAttribute("data-y", "6");
      await expect(game).toHaveAttribute("data-animating", "false");
    }
    await expect(game).toHaveAttribute("data-handoff", "false");
    const reverted = ["undo", "restart", "swap", "room"].includes(action);
    await expect(pip).toHaveAttribute("data-module", reverted ? "magnet" : "power");
    await expect(bolt).toHaveAttribute("data-module", reverted ? "power" : "magnet");
    if (action === "switch") await expect(bolt).toHaveClass(/active/);
    // No deferred completion may overwrite a later action or module owner.
    await page.waitForTimeout(400);
    await expect(game).toHaveAttribute("data-handoff", "false");
    await expect(pip).toHaveAttribute("data-module", reverted ? "magnet" : "power");
    const mounts = await game.evaluate(field => {
      const data = (field as HTMLElement).dataset;
      return ["pip", "bolt"].map(id => {
        const bot = JSON.parse(data[id === "pip" ? "visualPip" : "visualBolt"]!);
        const module = document.querySelector(`[data-testid="robot-${id}"]`)!.getAttribute("data-module");
        const drawn = JSON.parse(data[module === "magnet" ? "visualMagnet" : "visualPower"]!);
        return Math.hypot(drawn.x - (bot.x - Math.sin(bot.angle) * 9), drawn.y - (bot.y + Math.cos(bot.angle) * 9));
      });
    });
    for (const distance of mounts) expect(distance, `${action}: rendered module at current owner's mount`).toBeLessThan(0.001);
    await game.focus();
    await page.keyboard.press("d");
    await expect(game).toHaveAttribute("data-animating", "false");
  }
});

test("handoff validity, vertical exchange, reduced motion and changing motion preference", async ({ page }) => {
  await ready(page, "modules"); // Diagonal neighbours must not animate or swap.
  const game = page.locator("#game"), pip = page.getByTestId("robot-pip");
  await page.keyboard.press("t");
  await expect(game).toHaveAttribute("data-handoff", "false");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
  await keys(page, [{ type: "move", direction: "right" }]);
  await recordFrames(page, 500);
  await page.waitForTimeout(40);
  await page.keyboard.press("t"); // Vertical neighbours, different facings.
  const vertical = await frames(page);
  expect(vertical.filter(f => f.handoff).length).toBeGreaterThan(8);
  expect(new Set(vertical.filter(f => f.handoff).map(f => f.hash)).size).toBeGreaterThan(6);
  expect(vertical.at(-1)!.magnet).toEqual(vertical[0].power);
  expect(vertical.at(-1)!.power).toEqual(vertical[0].magnet);
  await expect(pip).toHaveAttribute("data-module", "power");
  await page.keyboard.press("z");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const immediate = await game.evaluate(field => {
    field.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyT", bubbles: true }));
    field.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyT", bubbles: true }));
    const g = field as HTMLElement;
    return { handoff: g.dataset.handoff, power: JSON.parse(g.dataset.visualPower!), pip: JSON.parse(g.dataset.visualPip!) };
  });
  expect(immediate.handoff).toBe("false");
  expect(immediate.power).toEqual({ x: immediate.pip.x - 9, y: immediate.pip.y });
  await expect(pip).toHaveAttribute("data-module", "power");
  await page.evaluate(() => {
    const target = window as unknown as { motionPreferenceRestored: boolean };
    target.motionPreferenceRestored = false;
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
      target.motionPreferenceRestored = true;
    }, { once: true });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Wait for the actual media event, then observe the short-lived handoff in
  // the same task as its input, independently of test-runner transport delays.
  await page.waitForFunction(() => (window as unknown as { motionPreferenceRestored: boolean }).motionPreferenceRestored);
  const started = await game.evaluate(field => {
    field.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyT", bubbles: true }));
    field.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyT", bubbles: true }));
    return (field as HTMLElement).dataset.handoff;
  });
  expect(started).toBe("true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(game).toHaveAttribute("data-handoff", "false");
  await expect(pip).toHaveAttribute("data-module", "magnet");
  await page.waitForTimeout(400);
  await expect(pip).toHaveAttribute("data-module", "magnet");
});

test("continuous drive: tap, hold across centres, release, smooth turns, pixel/timing evidence and undo", async ({ page }, info) => {
  await ready(page, "freight");
  await page.keyboard.press("Shift"); // Freight row 7 is clear from x4 through x8.
  const game = page.locator("#game"), bolt = page.getByTestId("robot-bolt");
  await page.keyboard.press("d");
  await expect(game).toHaveAttribute("data-animating", "false");
  await page.waitForTimeout(240);
  await expect(bolt).toHaveAttribute("data-x", "5");
  await page.keyboard.press("z");
  await recordFrames(page, 780);
  await page.keyboard.down("d");
  await page.waitForTimeout(420);
  await page.keyboard.up("d");
  const samples = await frames(page);
  await attachEvidence(info, "continuous-canvas-frames.json", samples);
  await expect(bolt).toHaveAttribute("data-x", "7"); // 3 legal raster moves
  await expect(page.locator("#move-count")).toHaveText("4 Aktionen");
  expect(samples.length).toBeGreaterThan(8);
  expect(new Set(samples.map(f => f.hash)).size).toBeGreaterThan(6);
  // The two interior boundaries (x=275 and x=325) retain travel speed.
  for (const centre of [275, 325]) {
    const index = samples.findIndex(f => f.bolt.x >= centre);
    expect(index).toBeGreaterThan(1);
    const span = samples.slice(index - 2, index + 2);
    const velocity = (span.at(-1)!.bolt.x - span[0].bolt.x) / (span.at(-1)!.t - span[0].t);
    expect(velocity).toBeGreaterThan(0.20);
    expect(velocity).toBeLessThan(0.35);
  }
  expect(samples.at(-1)!.bolt.x).toBe(375);
  expect(samples.at(-1)!.bolt.y).toBe(375);
  // Turn 90 degrees: inspect intermediate angles, not only facing metadata.
  await recordFrames(page, 300);
  await page.keyboard.press("s");
  const turning = await frames(page);
  expect(turning.some(f => f.bolt.angle > Math.PI / 2 + 0.05 && f.bolt.angle < Math.PI - 0.05)).toBe(true);
  await attachEvidence(info, "turn-canvas-frames.json", turning);
  for (let n = 0; n < 4; n++) await page.keyboard.press("z");
  await expect(bolt).toHaveAttribute("data-x", "4");
  await expect(bolt).toHaveAttribute("data-y", "7");
  await expect(bolt).toHaveAttribute("data-facing", "up");
  await expect(page.locator("#move-count")).toHaveText("1 Aktionen");
});

test("held magnet load stays synchronous, looks backward, stops at obstacle without feedback/undo flood", async ({ page }, info) => {
  await ready(page, "modules");
  await keys(page, moduleSolution.slice(0, 5));
  const game = page.locator("#game"), pip = page.getByTestId("robot-pip");
  await page.keyboard.down("e");
  await recordFrames(page, 1000);
  await page.keyboard.down("a");
  await page.waitForTimeout(650);
  await expect(pip).toHaveAttribute("data-x", "3");
  await expect(pip).toHaveAttribute("data-facing", "right");
  await expect(game).toHaveAttribute("data-crate", "4,2");
  await expect(page.locator("#move-count")).toHaveText("7 Aktionen");
  const message = await page.locator("#feedback").textContent();
  await page.waitForTimeout(350);
  await expect(page.locator("#feedback")).toHaveText(message!);
  await expect(page.locator("#move-count")).toHaveText("7 Aktionen");
  await page.keyboard.up("a"); await page.keyboard.up("e");
  const samples = await frames(page);
  for (const f of samples) {
    expect(f.crate!.x - f.pip.x).toBeCloseTo(50, 6);
    expect(f.crate!.y).toBe(f.pip.y);
    expect(f.pip.angle).toBeCloseTo(Math.PI / 2, 6);
  }
  expect(new Set(samples.map(f => f.hash)).size).toBeGreaterThan(6);
  await attachEvidence(info, "magnet-canvas-frames.json", samples);
  await page.keyboard.press("z");
  await expect(pip).toHaveAttribute("data-x", "4");
  await expect(game).toHaveAttribute("data-crate", "5,2");
  await page.keyboard.press("z");
  await expect(pip).toHaveAttribute("data-x", "5");
  await expect(game).toHaveAttribute("data-crate", "6,2");
  // Bolt's push uses exactly the same clock and interpolation for its load.
  await page.locator("#room-select").selectOption("freight");
  await keys(page, freightSetup);
  await page.keyboard.down("e");
  await recordFrames(page, 600);
  await page.keyboard.down("s");
  const pushing = await frames(page);
  await page.keyboard.up("s"); await page.keyboard.up("e");
  for (const f of pushing) {
    expect(f.crate!.y - f.bolt.y).toBeCloseTo(50, 6);
    expect(f.crate!.x).toBe(f.bolt.x);
  }
  await expect(game).toHaveAttribute("data-crate", "5,4");
  await expect(page.locator("#move-count")).toHaveText(`${freightSetup.length + 1} Aktionen`);
  await attachEvidence(info, "push-canvas-frames.json", pushing);
});

test("held input resets on E release, commands, focus, hidden tab, frame pause and motion preference", async ({ page }) => {
  await ready(page, "freight");
  const game = page.locator("#game");
  // Every context command must cancel held direction and its pending intention.
  for (const key of ["Shift", "t", "z", "r"]) {
    await page.keyboard.press("r");
    await page.keyboard.press("Shift");
    await page.keyboard.down("d");
    await page.keyboard.press(key);
    const count = await page.locator("#move-count").textContent();
    await page.waitForTimeout(450);
    await expect(page.locator("#move-count")).toHaveText(count!);
    await page.keyboard.up("d");
  }
  for (const reset of ["window", "field", "hidden", "pause", "room", "motion"]) {
    await page.locator("#room-select").selectOption("freight");
    await page.keyboard.press("Shift");
    await page.keyboard.down("d");
    if (reset === "window") await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    if (reset === "field") await page.locator("#room-select").focus();
    if (reset === "hidden") await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      delete (document as unknown as Record<string, unknown>).hidden;
    });
    if (reset === "pause") await page.evaluate(() => { const end = performance.now() + 420; while (performance.now() < end) { /* simulate stalled frame */ } });
    if (reset === "room") await page.locator("#room-select").selectOption("modules");
    if (reset === "motion") await page.emulateMedia({ reducedMotion: "reduce" });
    const count = await page.locator("#move-count").textContent();
    await page.waitForTimeout(450);
    await expect(page.locator("#move-count")).toHaveText(count!);
    await expect(game).toHaveAttribute("data-animating", "false");
    await page.keyboard.up("d");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await game.focus();
  }
  await page.locator("#room-select").selectOption("modules");
  await keys(page, moduleSolution.slice(0, 5));
  await page.keyboard.down("e"); await page.keyboard.down("a");
  await page.waitForTimeout(60); await page.keyboard.up("e");
  await page.waitForTimeout(450);
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "4");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("a");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.keyboard.press("r");
  await page.keyboard.down("w");
  await page.waitForTimeout(410); await page.keyboard.up("w");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-y", "2");
  await expect(game).toHaveAttribute("data-animating", "false");
  const visual = JSON.parse((await game.getAttribute("data-visual-pip"))!);
  expect(visual.y).toBe(125);
  // Fast discrete taps must not push the held timer into the future in reduce mode.
  await page.locator("#room-select").selectOption("freight");
  await page.keyboard.press("Shift");
  await page.keyboard.press("d"); await page.keyboard.press("d");
  await page.keyboard.down("d");
  await page.waitForTimeout(240); await page.keyboard.up("d");
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "8");
});

test("multiple directions: last pressed wins, aliases release independently, rapid corner tap waits for centre", async ({ page }) => {
  await ready(page, "freight");
  await page.keyboard.press("Shift");
  const bolt = page.getByTestId("robot-bolt"), game = page.locator("#game");
  await page.keyboard.down("d");
  await page.keyboard.down("s"); // replaces direction at next centre
  await page.keyboard.up("s");
  await page.keyboard.up("d");
  await expect(game).toHaveAttribute("data-animating", "false");
  await expect(bolt).toHaveAttribute("data-x", "5");
  await expect(bolt).toHaveAttribute("data-y", "8");
  await page.waitForTimeout(240);
  await expect(page.locator("#move-count")).toHaveText("3 Aktionen");
  await page.keyboard.press("r"); await page.keyboard.press("Shift");
  await page.keyboard.down("d"); await page.keyboard.down("ArrowRight");
  await page.keyboard.up("d");
  await page.waitForTimeout(230); await page.keyboard.up("ArrowRight");
  await expect(game).toHaveAttribute("data-animating", "false");
  await expect(bolt).toHaveAttribute("data-x", "6");
  await expect(bolt).toHaveAttribute("data-y", "7");
  await page.locator("#room-select").selectOption("bodies");
  await keys(page, bodySolution.slice(0, 6));
  await page.keyboard.down("d");
  await expect(game).toHaveAttribute("data-won", "true");
  const count = await page.locator("#move-count").textContent();
  await page.waitForTimeout(400);
  await expect(page.locator("#move-count")).toHaveText(count!);
  await page.keyboard.press("z");
  await page.waitForTimeout(300);
  await expect(game).toHaveAttribute("data-won", "false");
  await page.keyboard.up("d");
});


test("freight story: quiet order, real power and cargo captions, undo/reset/room stay truthful", async ({ page }, info) => {
  await ready(page, "freight");
  const game = page.locator("#game"), caption = page.locator("#freight-story");
  await expect(page.locator("#mission-title")).toHaveText("Werkstattauftrag");
  await expect(page.locator("#objective")).toContainText("Ersatzteile in die Abstellnische");
  await expect(page.locator("#feedback")).toContainText("verlasst gemeinsam die Werkstatt");
  expect(await page.locator("#room-hint").textContent()).not.toMatch(/Tauscht zuerst|oben um die Kiste|Pip versorgt A/);
  await expect(caption).toBeHidden();
  await page.screenshot({ path: info.outputPath("beginn.png"), fullPage: true });
  await keys(page, freightSetup.slice(0, 1));
  await expect(caption).toBeHidden(); // A valid module exchange alone is not useful power yet.
  await keys(page, freightSetup.slice(1, 8)); // Socket reached; no connection yet.
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-y", "4");
  await expect(caption).toBeHidden();
  await keys(page, freightSetup.slice(8, 9)); // Actual E connection, not just T.
  await expect(caption).toHaveText("Pip: Oh, hier summt’s! Strom ist da.");
  await page.screenshot({ path: info.outputPath("pip-strom.png"), fullPage: true });
  await page.keyboard.press("z");
  await expect(caption).toBeHidden();
  await page.keyboard.press("e");
  await expect(caption).toContainText("Pip:");
  // Invalid non-adjacent swaps do not recreate the visible line or queue speech.
  await caption.evaluate(el => {
    const target = window as unknown as { storyMutations: number };
    target.storyMutations = 0;
    new MutationObserver(entries => { target.storyMutations += entries.length; }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  for (let n = 0; n < 3; n++) await page.keyboard.press("t");
  expect(await page.evaluate(() => (window as unknown as { storyMutations: number }).storyMutations)).toBe(0);
  expect(await caption.getAttribute("aria-live")).toBeNull();
  await keys(page, freightSetup.slice(9));
  await expect(game).toHaveAttribute("data-crate", "5,3");
  await expect(caption).toContainText("Pip:");
  await keys(page, [{ type: "pull", direction: "down" }]);
  await expect(game).toHaveAttribute("data-crate", "5,4");
  await expect(caption).toHaveText("Bolt: Die Fracht hält. Solider Kollege.");
  await expect(page.locator("#progress li").first()).toHaveClass("done");
  await page.screenshot({ path: info.outputPath("bolt-fracht.png"), fullPage: true });
  await page.keyboard.press("z");
  await expect(game).toHaveAttribute("data-crate", "5,3");
  await expect(caption).toContainText("Pip:");
  await expect(page.locator("#progress li").first()).not.toHaveClass("done");
  await page.keyboard.press("r");
  await expect(caption).toBeHidden();
  await expect(game).toHaveAttribute("data-freight-stage", "order");
  await keys(page, freightSetup.slice(0, 9));
  await expect(caption).toContainText("Pip:");
  await page.locator("#room-select").selectOption("routes");
  await expect(caption).toBeHidden();
  await page.locator("#room-select").selectOption("freight");
  await page.waitForTimeout(1100);
  await expect(caption).toBeHidden();
  await expect(game).toHaveAttribute("data-freight-stage", "order");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
});

test("freight story: visible shared finish, real antenna/nod frames, undo and replay without celebration flood", async ({ page }, info) => {
  await ready(page, "freight");
  const game = page.locator("#game"), caption = page.locator("#freight-story");
  await keys(page, freightSolution.slice(0, -1));
  const floorBefore = await page.locator("canvas").evaluate((c: HTMLCanvasElement) =>
    [...c.getContext("2d")!.getImageData(390, 315, 20, 20).data]);
  await recordFrames(page, 1450, true, { x: 690, y: 380, width: 120, height: 100, stride: 4 });
  await page.waitForTimeout(40);
  await keys(page, freightSolution.slice(-1));
  await expect(game).toHaveAttribute("data-won", "true");
  const samples = await frames(page);
  const gestures = samples.filter(f => f.celebrating && Math.abs(f.pip.wave) > 0.5 && f.bolt.nod > 0.5);
  expect(gestures.length).toBeGreaterThan(8);
  expect(new Set(gestures.map(f => f.hash)).size).toBeGreaterThan(6);
  expect(Math.max(...gestures.map(f => f.pip.wave))).toBeGreaterThan(3);
  expect(Math.min(...gestures.map(f => f.pip.wave))).toBeLessThan(-3);
  expect(Math.max(...gestures.map(f => f.bolt.nod))).toBeGreaterThan(2.5);
  expect(samples.at(-1)!.celebrating).toBe(false);
  for (const [n, frame] of [samples[0], gestures[0], gestures[Math.floor(gestures.length / 2)], gestures.at(-1)!, samples.at(-1)!].entries()) {
    await writeFile(info.outputPath(`abschluss-frame-${n}.png`), Buffer.from(frame.png!.split(",")[1], "base64"));
  }
  await attachEvidence(info, "abschluss-frames.json", samples.map(({ png: _png, ...sample }) => sample));
  await page.screenshot({ path: info.outputPath("abschluss.png"), fullPage: true });
  await expect(caption).toContainText("Pip: Ersatzteile da. Wir auch!");
  await expect(caption).toContainText("Bolt: Feierabend zu zweit.");
  // Actual lamp pixels and the canvas band where the old generic overlay hid the room.
  const pixels = await page.locator("canvas").evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d")!;
    return { lamp: [...ctx.getImageData(725, 295, 1, 1).data], floor: [...ctx.getImageData(390, 315, 20, 20).data] };
  });
  expect(pixels.lamp.slice(0, 3)).toEqual([129, 228, 207]);
  // Preserve the actual lit floor pixels, including existing service-lamp glow.
  expect(pixels.floor).toEqual(floorBefore);
  await page.keyboard.press("z");
  await expect(game).toHaveAttribute("data-won", "false");
  await expect(caption).toHaveText("Bolt: Die Fracht hält. Solider Kollege.");
  await keys(page, freightSolution.slice(-1));
  await expect(game).toHaveAttribute("data-celebrating", "false");
  await expect(caption).toContainText("Feierabend zu zweit");
  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-room", "routes");
  await page.waitForTimeout(1100);
  await expect(caption).toBeHidden();
  await expect(game).toHaveAttribute("data-celebrating", "false");
});

test("freight story: reduced motion has a static confirmed ending and opt-in sound", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page, "freight");
  await keys(page, freightSolution);
  const game = page.locator("#game");
  await expect(game).toHaveAttribute("data-celebrating", "false");
  await expect(page.locator("#freight-story")).toContainText("Feierabend zu zweit");
  await expect(page.locator("#mute")).toHaveText("Ton: aus");
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "false");
  await recordFrames(page, 500, false, { x: 0, y: 0, width: 850, height: 650, stride: 4 });
  const samples = await frames(page);
  expect(samples.length).toBeGreaterThan(8);
  expect(new Set(samples.map(f => f.hash)).size).toBe(1);
  expect(samples.every(f => f.pip.wave === 0 && f.bolt.nod === 0)).toBe(true);
  await attachEvidence(info, "reduced-motion-frames.json", samples);
  await page.screenshot({ path: info.outputPath("abschluss-reduced-motion.png"), fullPage: true });
  await page.keyboard.press("z");
  await expect(game).toHaveAttribute("data-freight-stage", "cargo");
  await page.keyboard.press("r");
  await expect(page.locator("#freight-story")).toBeHidden();
  await expect(page.locator("#next-room")).toBeHidden();
});

test("freight story: active finish is cancelled by undo, reset, room, blur, suspension and reduced motion", async ({ page }) => {
  for (const action of ["undo", "restart", "room", "blur", "pause", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, "freight");
    await keys(page, freightSolution.slice(0, -1));
    await page.evaluate(() => {
      (window as unknown as { restored: boolean }).restored = false;
      window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
        (window as unknown as { restored: boolean }).restored = true;
      }, { once: true });
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => (window as unknown as { restored: boolean }).restored);
    const result = await page.locator("#game").evaluate((field, action) => {
      const press = (code: string) => {
        field.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
        field.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
      };
      press("ArrowDown");
      const started = (field as HTMLElement).dataset.celebrating;
      if (action === "room") {
        const select = document.querySelector<HTMLSelectElement>("#room-select")!;
        select.value = "routes"; select.dispatchEvent(new Event("change"));
      } else if (action === "blur") window.dispatchEvent(new Event("blur"));
      else if (action === "pause") {
        const end = performance.now() + 280;
        while (performance.now() < end) { /* simulate a stalled frame */ }
      } else if (action === "undo" || action === "restart") press(action === "undo" ? "KeyZ" : "KeyR");
      return started;
    }, action);
    expect(result, action).toBe("true");
    if (action === "reduce") await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("#game")).toHaveAttribute("data-celebrating", "false");
    await page.waitForTimeout(1100);
    await expect(page.locator("#game")).toHaveAttribute("data-celebrating", "false");
    await expect(page.locator("#game")).toHaveAttribute("data-freight-stage",
      action === "room" ? "off" : action === "restart" ? "order" : action === "undo" ? "cargo" : "done");
    const bots = await page.locator("#game").evaluate(field => ["visualPip", "visualBolt"].map(k => JSON.parse((field as HTMLElement).dataset[k]!)));
    expect(bots.every(b => b.wave === 0 && b.nod === 0)).toBe(true);
  }
});
