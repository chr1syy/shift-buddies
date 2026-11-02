import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dispatch,
  newSession,
  initialState,
  transition,
  isPowered,
  isDoorOpen,
  isPlateHeld,
  isWon,
  tileAt,
  same,
  ROOMS,
  ROOM_ORDER,
} from "../src/game/rules.ts";
import type { Action, State, RobotId, Position, RoomId } from "../src/game/rules.ts";
import { solution, fullSolution, bodySolution, moduleSolution } from "./solution.ts";

const play = (state: State, actions: Action[]): State =>
  actions.reduce((s, a) => transition(s, a).state, state);
const up: Action = { type: "move", direction: "up" };
const right: Action = { type: "move", direction: "right" };
const interact: Action = { type: "interact" };
const cleared = (): State => play(initialState(), solution.clearCrate);
const powered = (): State => play(cleared(), solution.swapAndPower);
const held = (): State => play(powered(), solution.boltToPlate);
const position = (s: State, id: RobotId, x: number, y: number): State => ({
  ...s,
  robots: { ...s.robots, [id]: { ...s.robots[id], x, y } },
});

test("complete intended solution: crate → swap → power → plate → both exits", () => {
  let s = cleared();
  assert.deepEqual(s.crate, { x: 4, y: 2 });
  assert.equal(s.robots.pip.module, "magnet");
  s = play(s, solution.swapAndPower);
  assert.equal(s.robots.pip.module, "power");
  assert.equal(s.robots.bolt.module, "magnet");
  assert.equal(isPowered(s), true);
  assert.equal(isDoorOpen(s), true);
  s = play(s, solution.boltToPlate);
  assert.equal(isPlateHeld(s), true);
  assert.equal(isPowered(s), true);
  s = play(s, solution.pipToExit);
  assert.equal(isPowered(s), false);
  assert.equal(isDoorOpen(s), true);
  s = play(s, solution.boltToExit);
  assert.equal(isWon(s), true);
  assert.equal(isDoorOpen(s), false);
  assert.equal(
    s.actions,
    fullSolution.length,
    "route contains no rejected or redundant actions",
  );
});

test("undo restores every exact snapshot of the solution, including the winning step", () => {
  let session = newSession();
  const snapshots = [session.state];
  for (const action of fullSolution) {
    session = dispatch(session, action);
    snapshots.push(session.state);
  }
  assert.equal(isWon(session.state), true);
  for (let i = snapshots.length - 2; i >= 0; i--) {
    session = dispatch(session, { type: "undo" });
    assert.deepEqual(session.state, snapshots[i], `snapshot ${i}`);
  }
  assert.deepEqual(session.state, initialState());
  assert.equal(session.history.length, 0);
  assert.deepEqual(dispatch(session, { type: "undo" }).state, initialState());
});

test("restart resets robots, modules, crate, connection, active robot and undo history", () => {
  let session = newSession();
  for (const action of fullSolution) session = dispatch(session, action);
  session = dispatch(session, { type: "restart" });
  assert.deepEqual(session.state, initialState());
  assert.equal(session.history.length, 0);
});

test("power persists across Shift and blocked movement; moving away or E disconnects", () => {
  const s = powered();
  const switched = transition(s, { type: "switch" }).state;
  assert.equal(isPowered(switched), true);
  assert.equal(isPowered(transition(s, right).state), true); // wall at 9/2
  assert.equal(isPowered(transition(s, interact).state), false);
  const moved = transition(s, { type: "move", direction: "left" }).state;
  assert.equal(moved.connected, null);
  assert.equal(isDoorOpen(moved), false);
  assert.deepEqual(
    transition(switched, interact).state,
    switched,
    "Bolt cannot connect remotely",
  );
});

test("body and module are independent: only Pip fits the shaft; only Bolt holds plate", () => {
  for (const module of ["magnet", "power"] as const) {
    let s = position(initialState(), "bolt", 3, 5);
    s = {
      ...s,
      active: "bolt",
      robots: { ...s.robots, bolt: { ...s.robots.bolt, module } },
    };
    assert.deepEqual(transition(s, up).state.robots.bolt, s.robots.bolt);
    s = position(initialState(), "pip", 3, 5);
    assert.equal(transition(s, up).state.robots.pip.y, 4);
  }
  const pipOnPlate = position(initialState(), "pip", 12, 7);
  assert.equal(isPlateHeld(pipOnPlate), false);
  assert.equal(isDoorOpen(pipOnPlate), false);
  assert.equal(isPlateHeld(position(initialState(), "bolt", 12, 7)), true);
});

test("magnet pulls only the facing metal crate with free space behind; no pushing", () => {
  let s = position(initialState(), "pip", 5, 2);
  s = {
    ...s,
    robots: { ...s.robots, pip: { ...s.robots.pip, facing: "right" } },
  };
  assert.deepEqual(
    transition(s, right).state,
    s,
    "walking into crate never pushes it",
  );
  const pulled = transition(s, interact).state;
  assert.deepEqual(pulled.crate, { x: 5, y: 2 });
  assert.equal(pulled.robots.pip.x, 4);
  assert.deepEqual(
    transition(
      {
        ...s,
        robots: { ...s.robots, pip: { ...s.robots.pip, module: "power" } },
      },
      interact,
    ).state.crate,
    s.crate,
  );
  assert.deepEqual(
    transition(
      {
        ...s,
        robots: { ...s.robots, pip: { ...s.robots.pip, facing: "down" } },
      },
      interact,
    ).state.crate,
    s.crate,
  );
  const buddyBehind = position(s, "bolt", 4, 2);
  assert.deepEqual(transition(buddyBehind, interact).state, buddyBehind);
  const wallBehind = { ...position(s, "pip", 3, 2), crate: { x: 4, y: 2 } };
  assert.deepEqual(transition(wallBehind, interact).state, wallBehind);
  const noCrate = initialState();
  assert.deepEqual(transition(noCrate, interact).state, noCrate);
});

test("swap requires orthogonal adjacency, and is exactly undoable", () => {
  const initial = newSession();
  assert.equal(dispatch(initial, { type: "swap" }).history.length, 0);
  const diagonal = position(initial.state, "pip", 3, 7);
  assert.deepEqual(transition(diagonal, { type: "swap" }).state, diagonal);
  const neighbors = dispatch(initial, right);
  const swapped = dispatch(neighbors, { type: "swap" });
  assert.equal(swapped.state.robots.pip.module, "power");
  assert.deepEqual(dispatch(swapped, { type: "undo" }).state, neighbors.state);
});

test("walls, occupied fields and closed door block movement; a facing change is undoable", () => {
  const s = position(initialState(), "pip", 9, 7);
  assert.equal(transition(s, right).state.robots.pip.x, 9);
  const collision = position(initialState(), "pip", 3, 8);
  assert.equal(transition(collision, right).state.robots.pip.x, 3);
  let session = {
    ...newSession(),
    state: position(initialState(), "pip", 1, 5),
  };
  const before = session.state;
  session = dispatch(session, { type: "move", direction: "left" });
  assert.equal(session.state.robots.pip.facing, "left");
  assert.equal(session.state.robots.pip.x, 1);
  assert.deepEqual(dispatch(session, { type: "undo" }).state, before);
});

// Flood fill checks topology independently from transition(), ignoring the other
// robot. Therefore it gives each body MORE freedom than actual play does.
function reachable(
  start: Position,
  id: RobotId,
  crate: Position,
  doorOpen: boolean,
  room: RoomId = "tech",
): Set<string> {
  const seen = new Set<string>();
  const todo = [start];
  while (todo.length) {
    const p = todo.pop()!;
    const key = `${p.x},${p.y}`;
    const tile = tileAt(p, room);
    if (
      seen.has(key) ||
      tile === "#" ||
      tile === "O" ||
      same(p, crate) ||
      (tile === "v" && id === "bolt") ||
      (tile === "D" && !doorOpen)
    )
      continue;
    seen.add(key);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      todo.push({ x: p.x + dx, y: p.y + dy });
  }
  return seen;
}

test("layout has no walking bypass: two pulls, Pip shaft and door are required", () => {
  const s = initialState();
  for (const x of [6, 5])
    assert.equal(
      reachable(s.robots.pip, "pip", { x, y: 2 }, false).has("8,2"),
      false,
    );
  assert.equal(
    reachable(s.robots.pip, "pip", { x: 4, y: 2 }, false).has("8,2"),
    true,
  );
  assert.equal(
    reachable(s.robots.bolt, "bolt", { x: 4, y: 2 }, true).has("8,2"),
    false,
  );
  for (const id of ["pip", "bolt"] as const) {
    const closed = reachable(s.robots[id], id, { x: 4, y: 2 }, false);
    assert.equal(closed.has("12,7"), false, "plate is beyond the door");
    assert.equal(closed.has("14,9"), false, "exit is beyond the door");
    assert.equal(
      reachable(s.robots[id], id, { x: 4, y: 2 }, true).has("14,9"),
      true,
    );
  }
});

test("without the plate, releasing power strands Pip; plate release closes door without latching", () => {
  let s = powered();
  s = position(s, "bolt", 14, 9); // Bolt tries going straight to the exit
  s = transition(s, interact).state;
  assert.equal(isDoorOpen(s), false);
  assert.equal(isWon(s), false);
  assert.equal(
    reachable(s.robots.pip, "pip", s.crate!, false).has("14,9"),
    false,
  );
  s = held();
  s = transition(s, { type: "switch" }).state;
  s = transition(s, interact).state;
  assert.equal(isDoorOpen(s), true);
  s = transition(s, { type: "switch" }).state;
  s = transition(s, right).state;
  assert.equal(isDoorOpen(s), false);
});

test("one robot at exit does not win; won state accepts only undo or restart", () => {
  const one = play(held(), solution.pipToExit);
  assert.equal(isWon(one), false);
  const won = play(one, solution.boltToExit);
  assert.equal(isWon(won), true);
  for (const action of [
    up,
    interact,
    { type: "switch" },
    { type: "swap" },
  ] as Action[])
    assert.equal(transition(won, action).state, won);
});

for (const [room, route] of [["bodies", bodySolution], ["modules", moduleSolution], ["tech", fullSolution]] as const) {
  test(`${room}: valid grid, complete solution, every undo snapshot and local restart`, () => {
    assert.equal(ROOMS[room].grid.length, 13);
    assert.ok(ROOMS[room].grid.every(row => row.length === 17));
    let session = newSession(room);
    const snapshots = [session.state];
    for (const action of route) {
      const before = session.state.actions;
      session = dispatch(session, action);
      assert.equal(session.state.actions, before + 1, JSON.stringify(action));
      snapshots.push(session.state);
    }
    assert.equal(isWon(session.state), true);
    assert.equal(session.state.actions, route.length);
    const restarted = dispatch(session, { type: "restart" });
    assert.deepEqual(restarted.state, initialState(room));
    assert.equal(restarted.history.length, 0);
    for (let i = snapshots.length - 2; i >= 0; i--) {
      session = dispatch(session, { type: "undo" });
      assert.deepEqual(session.state, snapshots[i]);
    }
    assert.equal(session.history.length, 0);
  });
}

test("room selection discards previous undo and restart stays in the chosen room", () => {
  let session = dispatch(newSession("tech"), right);
  for (const room of ROOM_ORDER) {
    session = dispatch(session, { type: "room", room });
    assert.deepEqual(session, newSession(room));
    session = dispatch(session, { type: "switch" });
    session = dispatch(session, { type: "restart" });
    assert.deepEqual(session.state, initialState(room));
    assert.deepEqual(dispatch(session, { type: "undo" }).state, initialState(room));
  }
});

test("body lesson requires Pip's shaft, Bolt's plate, and a switch; no module trick", () => {
  const s = initialState("bodies");
  assert.equal(reachable(s.robots.pip, "pip", { x: -1, y: -1 }, false, "bodies").has("8,5"), false);
  assert.equal(reachable(s.robots.bolt, "bolt", { x: -1, y: -1 }, true, "bodies").has("8,5"), false);
  assert.equal(reachable(s.robots.pip, "pip", { x: -1, y: -1 }, true, "bodies").has("8,5"), true);
  assert.equal(isWon(play(s, bodySolution.filter(a => a.type !== "switch"))), false);
  const atExit = position(s, "pip", 8, 5);
  assert.equal(isWon(atExit), false);
  assert.equal(isWon(position(atExit, "bolt", 5, 7)), true);
});

test("module lesson requires two metal pulls, Pip's body, exchange and power", () => {
  const s = initialState("modules");
  for (const x of [6, 5])
    assert.equal(reachable(s.robots.pip, "pip", { x, y: 2 }, true, "modules").has("8,2"), false);
  assert.equal(reachable(s.robots.pip, "pip", { x: 4, y: 2 }, true, "modules").has("8,2"), true);
  assert.equal(reachable(s.robots.bolt, "bolt", { x: 4, y: 2 }, true, "modules").has("8,2"), false);
  assert.equal(reachable(s.robots.bolt, "bolt", { x: 4, y: 2 }, false, "modules").has("7,6"), false);
  for (const type of ["interact", "swap", "switch"])
    assert.equal(isWon(play(s, moduleSolution.filter(a => a.type !== type))), false);
  const solved = play(s, moduleSolution);
  assert.equal(isPowered(solved), true);
  assert.equal(isWon({ ...solved, connected: null }), false);
});

test("anchored ceramic blocks movement and magnet E gives an explicit immutable rejection", () => {
  let s = initialState("modules");
  s = transition(s, { type: "move", direction: "left" }).state;
  assert.equal(s.robots.pip.x, 3);
  const result = transition(s, interact);
  assert.equal(result.state, s);
  assert.match(result.message, /verankert und nicht magnetisch/);
  assert.deepEqual(result.state.crate, { x: 6, y: 2 });
  assert.equal(tileAt({ x: 2, y: 5 }, s.room), "O");
  const session = { ...newSession("modules"), state: s };
  assert.equal(dispatch(session, interact).history.length, 0);
});
