import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Action } from "../src/game/rules.ts";
import { solution, fullSolution } from "./solution.ts";

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
