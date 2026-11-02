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
    { type: "pull", direction: "left" },
    { type: "pull", direction: "left" }, // Pip 3/2, crate 4/2
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

// Two short introductions. Victory deliberately keeps the supporting buddy at
// work: Bolt on the plate in room 1, Pip supplying power in room 2.
export const bodySolution: Action[] = [
  { type: "switch" }, ...walk("right", 2), { type: "switch" },
  ...walk("up", 2), ...walk("right", 6),
];
export const moduleSolution: Action[] = [
  ...walk("up", 3), ...walk("right", 2),
  { type: "pull", direction: "left" }, { type: "pull", direction: "left" },
  ...walk("down", 4), { type: "swap" },
  ...walk("up", 3), ...walk("right", 2), ...walk("up", 1),
  ...walk("right", 3), { type: "interact" },
  { type: "switch" }, ...walk("right", 3),
];

export const freightSolution: Action[] = [
  { type: "pull", direction: "down" }, ...walk("right", 2),
  ...walk("right", 1), ...walk("right", 4), ...walk("down", 1),
  { type: "switch" }, ...walk("right", 3), ...walk("up", 1),
  ...walk("right", 6), ...walk("down", 1),
];
export const routesSolution: Action[] = [
  ...walk("down", 2), { type: "swap" }, ...walk("up", 4), { type: "interact" },
  { type: "switch" }, ...walk("right", 4),
  { type: "switch" }, { type: "interact" }, ...walk("down", 4), ...walk("right", 4),
  { type: "swap" },
  { type: "switch" }, ...walk("up", 1), ...walk("right", 1), ...walk("up", 1), { type: "interact" },
  { type: "switch" }, ...walk("right", 7), // Pip 14/7, below crate
  ...walk("up", 1), // face the crate (blocked move, undoable turn)
  { type: "pull", direction: "down" }, ...walk("down", 1), // Pip 14/9
  { type: "switch" }, { type: "interact" }, ...walk("down", 2),
  ...walk("right", 3), ...walk("down", 1), ...walk("right", 3), ...walk("down", 1),
];
export const bridgeSolution: Action[] = [
  { type: "swap" }, ...walk("up", 2), ...walk("right", 1), { type: "interact" },
  { type: "switch" }, ...walk("right", 1), ...walk("up", 2), ...walk("right", 4), ...walk("down", 4),
  { type: "switch" }, { type: "interact" }, ...walk("left", 1), ...walk("down", 4), ...walk("right", 5),
  ...walk("up", 1), ...walk("right", 5),
  { type: "switch" }, ...walk("up", 1), ...walk("right", 3), ...walk("down", 1), ...walk("right", 1),
];
export const allSolutions = { bodies: bodySolution, modules: moduleSolution, tech: fullSolution,
  freight: freightSolution, routes: routesSolution, bridge: bridgeSolution };
