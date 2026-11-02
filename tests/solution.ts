import type { Action, Direction } from "../src/game/rules.ts";

const walk = (direction: Direction, count: number): Action[] =>
  Array.from({ length: count }, () => ({ type: "move", direction }));

// Explicit route, also used as real keyboard input by the browser test.
// Coordinates are zero-based (x / y), as shown on the robot cards.
export const solution = {
  clearCrate: [
    ...walk("right", 1),
    ...walk("up", 6),
    ...walk("right", 2),
    { type: "interact" },
    { type: "interact" }, // Pip 3/2, crate 4/2
  ],
  swapAndPower: [
    ...walk("down", 6),
    { type: "swap" }, // Pip 3/8, Bolt 4/8
    ...walk("up", 5),
    ...walk("right", 2),
    ...walk("up", 1),
    ...walk("right", 3),
    { type: "interact" }, // Pip connected at 8/2
  ],
  boltToPlate: [
    { type: "switch" },
    ...walk("right", 5),
    ...walk("up", 1),
    ...walk("right", 3), // Bolt 12/7
  ],
  pipToExit: [
    { type: "switch" },
    { type: "interact" }, // disconnect while Bolt holds plate
    ...walk("left", 3),
    ...walk("down", 1),
    ...walk("left", 2),
    ...walk("down", 4),
    ...walk("right", 8),
    ...walk("down", 2),
    ...walk("right", 3), // Pip 14/9
  ],
  boltToExit: [
    { type: "switch" },
    ...walk("right", 3),
    ...walk("down", 2), // Bolt 15/9
  ],
} satisfies Record<string, Action[]>;

export const fullSolution: Action[] = Object.values(solution).flat();
