// All rules are plain TypeScript. No Phaser, DOM, timers or hidden state.
export type RobotId = "pip" | "bolt";
export type Module = "magnet" | "power";
export type Direction = "up" | "down" | "left" | "right";
export type Position = Readonly<{ x: number; y: number }>;
export type Robot = Position & Readonly<{ module: Module; facing: Direction }>;
export type State = Readonly<{
  active: RobotId;
  robots: Readonly<Record<RobotId, Robot>>;
  crate: Position;
  connected: RobotId | null;
  actions: number;
}>;
export type Action =
  | { type: "move"; direction: Direction }
  | { type: "switch" }
  | { type: "swap" }
  | { type: "interact" };
export type Result = { state: State; message: string };

// # wall, . floor, v narrow shaft, S socket, D door, P heavy plate, X exit.
export const ROOM = [
  "#################",
  "#################",
  "###.....S########",
  "###...###########",
  "###v#############",
  "#.........#.....#",
  "#.........#.....#",
  "#.........D.P...#",
  "#.........#.....#",
  "#.........#...XX#",
  "#.........#.....#",
  "#.........#.....#",
  "#################",
] as const;

const DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const NAMES: Record<RobotId, string> = { pip: "Pip", bolt: "Bolt" };
export const same = (a: Position, b: Position): boolean =>
  a.x === b.x && a.y === b.y;
export const tileAt = (p: Position): string => ROOM[p.y]?.[p.x] ?? "#";
export const otherRobot = (id: RobotId): RobotId =>
  id === "pip" ? "bolt" : "pip";
export const adjacent = (a: Position, b: Position): boolean =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

export function initialState(): State {
  return {
    active: "pip",
    robots: {
      pip: { x: 2, y: 8, module: "magnet", facing: "up" },
      bolt: { x: 4, y: 8, module: "power", facing: "up" },
    },
    crate: { x: 6, y: 2 },
    connected: null,
    actions: 0,
  };
}

export function isPowered(s: State): boolean {
  if (!s.connected) return false;
  const robot = s.robots[s.connected];
  return robot.module === "power" && tileAt(robot) === "S";
}
export const isPlateHeld = (s: State): boolean => tileAt(s.robots.bolt) === "P";
export const isDoorOpen = (s: State): boolean => isPowered(s) || isPlateHeld(s);
export const isWon = (s: State): boolean =>
  Object.values(s.robots).every((r) => tileAt(r) === "X");

function blocked(s: State, id: RobotId, target: Position): string | null {
  const tile = tileAt(target);
  if (tile === "#") return "Hier ist eine Wand.";
  if (tile === "v" && id === "bolt")
    return "Bolt ist zu breit. Nur Pip passt durch den Schacht.";
  if (tile === "D" && !isDoorOpen(s))
    return "Die Tür braucht Strom oder Bolt auf der Druckplatte.";
  if (same(target, s.crate))
    return "Die Metallkiste blockiert. Mit Magnet davor ausrichten und E drücken; hinter dir muss Platz sein.";
  if (same(target, s.robots[otherRobot(id)]))
    return "Hier steht dein Buddy. Shift wechselt, T tauscht benachbarte Module.";
  return null;
}

// A rejected move may turn the robot to face an object. That turn is undoable too.
export function transition(s: State, action: Action): Result {
  if (isWon(s))
    return {
      state: s,
      message:
        "Geschafft! Beide Buddies sind am Ausgang. R startet neu, Z geht zurück.",
    };
  const id = s.active;
  const robot = s.robots[id];
  const buddyId = otherRobot(id);
  const buddy = s.robots[buddyId];
  const accept = (patch: Partial<State>, message: string): Result => ({
    state: { ...s, ...patch, actions: s.actions + 1 },
    message,
  });
  const reject = (message: string): Result => ({ state: s, message });
  if (action.type === "switch") {
    return accept(
      { active: buddyId },
      `${NAMES[buddyId]} ist aktiv.${isPowered(s) ? " Der Anschluss bleibt versorgt." : ""}`,
    );
  }
  if (action.type === "swap") {
    if (!adjacent(robot, buddy))
      return reject(
        "Zum Tauschen direkt nebeneinander stehen — diagonal reicht nicht.",
      );
    return accept(
      {
        robots: {
          ...s.robots,
          [id]: { ...robot, module: buddy.module },
          [buddyId]: { ...buddy, module: robot.module },
        },
        connected: null,
      },
      "Module getauscht. Pip und Bolt tragen jetzt das jeweils andere Modul.",
    );
  }
  if (action.type === "move") {
    const delta = DELTA[action.direction];
    const target = { x: robot.x + delta.x, y: robot.y + delta.y };
    const reason = blocked(s, id, target);
    if (reason && robot.facing === action.direction) return reject(reason);
    const nextRobot = {
      ...robot,
      ...(reason ? {} : target),
      facing: action.direction,
    };
    const nextConnected = !reason && s.connected === id ? null : s.connected;
    let message = reason ?? `${NAMES[id]} geht ein Feld.`;
    if (!reason && s.connected === id)
      message =
        "Pip hat den Anschluss verlassen. Die Stromverbindung ist gelöst.";
    if (!reason && tileAt(target) === "P")
      message =
        id === "bolt"
          ? "Bolt hält die schwere Druckplatte. Die Tür bleibt offen — Pip kann nachkommen."
          : "Pip ist zu leicht für diese Druckplatte. Hier wird Bolt gebraucht.";
    if (!reason && tileAt(target) === "S")
      message = "Anschluss erreicht. Mit Strommodul und E verbinden.";
    const result = accept(
      { robots: { ...s.robots, [id]: nextRobot }, connected: nextConnected },
      message,
    );
    if (isWon(result.state))
      result.message =
        "Geschafft! Pip und Bolt haben den Technikraum gemeinsam gelöst. R: noch einmal · Z: zurück.";
    return result;
  }
  if (robot.module === "power") {
    if (tileAt(robot) !== "S")
      return reject(
        "Das Strommodul braucht den Anschluss: auf das Ringfeld stellen und E drücken.",
      );
    const connected = s.connected === id ? null : id;
    return accept(
      { connected },
      connected
        ? "Strom verbunden. Die Tür ist offen. Shift wechselt zu Bolt und lässt den Strom an."
        : "Strom gelöst. Nur Bolt auf der Druckplatte hält die Tür jetzt offen.",
    );
  }
  const delta = DELTA[robot.facing];
  const front = { x: robot.x + delta.x, y: robot.y + delta.y };
  if (!same(front, s.crate))
    return reject(
      "Magnet: direkt vor der Metallkiste zu ihr schauen und E drücken. Du ziehst sie ein Feld zurück.",
    );
  const back = { x: robot.x - delta.x, y: robot.y - delta.y };
  if (blocked(s, id, back))
    return reject(
      "Kein Platz zum Zurückziehen. Hinter dir muss ein freies, begehbares Feld sein.",
    );
  return accept(
    {
      crate: { x: robot.x, y: robot.y },
      robots: { ...s.robots, [id]: { ...robot, ...back } },
    },
    "Magnet zieht: Du gehst ein Feld zurück, die Metallkiste folgt.",
  );
}

export type Session = Readonly<{
  state: State;
  history: readonly State[];
  message: string;
}>;
export type Command = Action | { type: "undo" } | { type: "restart" };
export function newSession(): Session {
  return {
    state: initialState(),
    history: [],
    message:
      "Pip ist aktiv und trägt den Magneten. Erkunde den Schacht links oben.",
  };
}
export function dispatch(session: Session, command: Command): Session {
  if (command.type === "restart")
    return {
      ...newSession(),
      message: "Raum neu gestartet. Pip trägt Magnet, Bolt trägt Strom.",
    };
  if (command.type === "undo") {
    const previous = session.history.at(-1);
    return previous
      ? {
          state: previous,
          history: session.history.slice(0, -1),
          message:
            "Letzte Aktion zurückgenommen — inklusive Blickrichtung und Verbindung.",
        }
      : { ...session, message: "Noch keine Aktion zum Zurücknehmen." };
  }
  const result = transition(session.state, command);
  return {
    state: result.state,
    history:
      result.state === session.state
        ? session.history
        : [...session.history, session.state],
    message: result.message,
  };
}
