import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Action, RoomId } from "../src/game/rules.ts";
import { solution, fullSolution, bodySolution, moduleSolution, freightSetup, routesSolution } from "./solution.ts";

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

test("buttons, focus recovery, held key and narrow viewport", async ({
  page,
}) => {
  await ready(page, "modules");
  await page.keyboard.down("d");
  await page.waitForTimeout(150);
  // Browser repeat events must not make the robot run away.
  await page
    .locator("#game")
    .dispatchEvent("keydown", { code: "KeyD", repeat: true, bubbles: true });
  await page.keyboard.up("d");
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
