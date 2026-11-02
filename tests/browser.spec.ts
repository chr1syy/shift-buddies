import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Action } from "../src/game/rules.ts";
import { solution, fullSolution, bodySolution, moduleSolution } from "./solution.ts";

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
async function ready(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#game")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("canvas")).toBeVisible();
  await page.locator("#room-select").selectOption("tech");
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
  await keys(page, solution.clearCrate);
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "3");
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
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "12");
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-y", "7");
  await keys(page, solution.pipToExit);
  await expect(page.locator("#door-status")).toContainText(
    "Bolt hält die Platte",
  );
  await keys(page, solution.boltToExit);
  await expect(page.locator("#feedback")).toContainText("Geschafft!");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "14");
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "15");
  await expect(page.locator("#door-status")).toContainText("TÜR ZU");
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
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "2");
  await expect(page.getByTestId("robot-bolt")).toHaveAttribute("data-x", "4");
  await page.keyboard.press("d"); // WASD and R
  await page.keyboard.press("r");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "2");
  expect(errors).toEqual([]);
});

test("buttons, focus recovery, held key and narrow viewport", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.down("d");
  await page.waitForTimeout(150);
  // Browser repeat events must not make the robot run away.
  await page
    .locator("#game")
    .dispatchEvent("keydown", { code: "KeyD", repeat: true, bubbles: true });
  await page.keyboard.up("d");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "3");
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
    "direkt vor der Metallkiste",
  );
  await page.getByRole("button", { name: "R · Neustart" }).click();
  await expect(page.locator("#undo")).toBeDisabled();
  await page.getByRole("heading", { name: "Shift Buddies" }).click();
  await page.locator("canvas").click();
  await page.keyboard.press("d");
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "3");
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
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "2");
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

test("held E plus direction: lateral/forward rejection, key repeat, release, blur, obstruction and transitions", async ({ page }) => {
  await ready(page);
  await page.locator("#room-select").selectOption("freight");
  const game = page.locator("#game"), pip = page.getByTestId("robot-pip");
  await page.keyboard.press("e");
  await expect(game).toHaveAttribute("data-crate", "5,4");
  await expect(page.locator("#move-count")).toHaveText("0 Aktionen");
  await page.keyboard.down("e");
  await expect(game).toHaveAttribute("data-pulling", "true");
  for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp"]) await page.keyboard.press(key);
  await expect(pip).toHaveAttribute("data-facing", "up");
  await expect(pip).toHaveAttribute("data-y", "5");
  await page.keyboard.down("ArrowDown");
  await page.keyboard.down("ArrowDown");
  await page.keyboard.up("ArrowDown");
  await expect(pip).toHaveAttribute("data-y", "6");
  await expect(game).toHaveAttribute("data-crate", "5,5");
  await expect(pip).toHaveAttribute("data-facing", "up");
  await expect(game).toHaveAttribute("data-animating", "false");
  await page.screenshot({ path: ".cache/expansion-magnet-link.png", fullPage: true });
  await page.keyboard.up("e");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.press("ArrowLeft");
  await expect(pip).toHaveAttribute("data-x", "4");
  await expect(pip).toHaveAttribute("data-facing", "left");
  await expect(game).toHaveAttribute("data-animating", "true");
  // Undo cancels an in-flight drive and restores the exact prior pull position.
  await page.keyboard.press("z");
  await expect(game).toHaveAttribute("data-animating", "false");
  await expect(pip).toHaveAttribute("data-x", "5");
  await page.keyboard.down("e");
  await page.keyboard.press("Shift");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await page.keyboard.press("Shift");
  await page.keyboard.down("e");
  await page.keyboard.press("z");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await page.locator("#room-select").selectOption("tech");
  await page.keyboard.press("d");
  await page.keyboard.down("e");
  await page.keyboard.press("t");
  await expect(pip).toHaveAttribute("data-module", "power");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await page.keyboard.press("z");
  await page.keyboard.down("e");
  await page.keyboard.press("r");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await page.keyboard.down("e");
  await page.locator("#room-select").selectOption("freight");
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  // Real DOM focus loss, followed by the standard window-blur event.
  // Headless Chromium keeps virtual windows focused, so tab switching cannot
  // stand in for the OS blur event; dispatch that event explicitly as well.
  await page.keyboard.down("e");
  await page.locator("#room-select").focus();
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await game.focus();
  await page.keyboard.down("e");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(game).toHaveAttribute("data-pulling", "false");
  await page.keyboard.up("e");
  await page.keyboard.press("ArrowLeft");
  await expect(pip).toHaveAttribute("data-x", "4");
  // Wall behind: pull twice south then the third pull cannot enter row 9.
  await page.keyboard.press("r");
  await page.keyboard.down("e");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(pip).toHaveAttribute("data-y", "8");
  await expect(game).toHaveAttribute("data-crate", "5,7");
  await expect(page.locator("#feedback")).toContainText("Kein Platz");
  await page.keyboard.up("e");
  await expect(game).toHaveAttribute("data-animating", "false");
});

test("in-flight Shift/restart/room, rotation views, supplied and occupied bridge, audio opt-in", async ({ page }) => {
  await ready(page);
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
  await expect(page.getByTestId("robot-pip")).toHaveAttribute("data-x", "3");
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
  await expect(page.locator("#door-status")).toContainText("BRÜCKE ZU");
  await page.screenshot({ path: ".cache/expansion-bridge-retracted.png", fullPage: true });
  await page.locator("#room-select").selectOption("freight");
  await expect(page.locator("#mute")).toHaveText("Ton: aus");
  await page.locator("#mute").click();
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "true");
  await keys(page, [{ type: "pull", direction: "down" }]);
  await page.locator("#mute").click();
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "false");
});
