import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Action } from "../src/game/rules.ts";
import { solution, fullSolution, bodySolution, moduleSolution } from "./solution.ts";

const keyFor = (action: Action): string =>
  action.type === "move"
    ? {
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
      }[action.direction]
    : { switch: "Shift", swap: "t", interact: "e" }[action.type];
async function keys(page: Page, actions: Action[]): Promise<void> {
  for (const action of actions) await page.keyboard.press(keyFor(action));
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
    if (action.type === "move") await keys(page, [action]);
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
