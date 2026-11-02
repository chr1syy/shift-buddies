// All rules are plain TypeScript. No Phaser, DOM, timers or hidden state.
export type RobotId = "pip" | "bolt";
export type Module = "magnet" | "power";
export type Direction = "up" | "down" | "left" | "right";
export type Position = Readonly<{ x: number; y: number }>;
export type Robot = Position & Readonly<{ module: Module; facing: Direction }>;
export type State = Readonly<{
  room: RoomId;
  active: RobotId;
  robots: Readonly<Record<RobotId, Robot>>;
  crate: Position | null;
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
  "#..O......#.....#",
  "#.........#.....#",
  "#################",
] as const;

export type RoomId = "bodies" | "modules" | "tech";
export const ROOM_ORDER: readonly RoomId[] = ["bodies", "modules", "tech"];
type RoomDefinition = Readonly<{
  title: string;
  objective: string;
  hint: string;
  grid: readonly string[];
  pip: Position;
  bolt: Position;
  crate: Position | null;
}>;
export const ROOMS: Record<RoomId, RoomDefinition> = {
  bodies: {
    title: "01 / Klein & schwer",
    objective: "Bring Pip zum Ausgang und halte mit Bolt die schwere Platte.",
    hint: "Ein schmaler Körper passt durch Gitter. Ein schwerer Körper hält die Tür offen. Shift wechselt deinen Buddy.",
    grid: [
      "#################",
      "#################",
      "#################",
      "#################",
      "#################",
      "#...v.D.X########",
      "#...#############",
      "#....P###########",
      "#...#############",
      "#################",
      "#################",
      "#################",
      "#################",
    ],
    pip: { x: 2, y: 7 }, bolt: { x: 3, y: 7 }, crate: null,
  },
  modules: {
    title: "02 / Energie teilen",
    objective: "Versorge den Anschluss und bring Bolt zum Ausgang.",
    hint: "Der Magnet zieht Metall zu dir. Verankerte Blöcke bleiben fest. Module wechseln mit T nur zwischen Nachbarn; Strom braucht E am Anschluss.",
    grid: [
      "#################",
      "#################",
      "###.....S########",
      "###...###########",
      "###v#############",
      "##O...###########",
      "##....DX#########",
      "##....###########",
      "#################",
      "#################",
      "#################",
      "#################",
      "#################",
    ],
    pip: { x: 3, y: 5 }, bolt: { x: 4, y: 6 }, crate: { x: 6, y: 2 },
  },
  tech: {
    title: "03 / Der Technikraum",
    objective: "Bring beide Buddies auf die zwei Ausgangsfelder.",
    hint: "Körper bleiben, Module wechseln. Wer kann den Anschluss erreichen? Wer hält die Tür offen, wenn die Stromversorgung endet?",
    grid: ROOM,
    pip: { x: 2, y: 8 }, bolt: { x: 4, y: 8 }, crate: { x: 6, y: 2 },
  },
};

const DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const NAMES: Record<RobotId, string> = { pip: "Pip", bolt: "Bolt" };
export const same = (a: Position, b: Position): boolean =>
  a.x === b.x && a.y === b.y;
export const tileAt = (p: Position, room: RoomId = "tech"): string =>
  ROOMS[room].grid[p.y]?.[p.x] ?? "#";
export const otherRobot = (id: RobotId): RobotId =>
  id === "pip" ? "bolt" : "pip";
export const adjacent = (a: Position, b: Position): boolean =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

export function initialState(room: RoomId = "tech"): State {
  return {
    room,
    active: "pip",
    robots: {
      pip: { ...ROOMS[room].pip, module: "magnet", facing: "up" },
      bolt: { ...ROOMS[room].bolt, module: "power", facing: "up" },
    },
    crate: ROOMS[room].crate,
    connected: null,
    actions: 0,
  };
}

export function isPowered(s: State): boolean {
  if (!s.connected) return false;
  const robot = s.robots[s.connected];
  return robot.module === "power" && tileAt(robot, s.room) === "S";
}
export const isPlateHeld = (s: State): boolean => tileAt(s.robots.bolt, s.room) === "P";
export const isDoorOpen = (s: State): boolean => isPowered(s) || isPlateHeld(s);
export const isWon = (s: State): boolean =>
  s.room === "bodies"
    ? tileAt(s.robots.pip, s.room) === "X" && isPlateHeld(s)
    : s.room === "modules"
      ? isPowered(s) && tileAt(s.robots.bolt, s.room) === "X"
      : Object.values(s.robots).every((r) => tileAt(r, s.room) === "X");

function blocked(s: State, id: RobotId, target: Position): string | null {
  const tile = tileAt(target, s.room);
  if (tile === "O") return "Der Keramikblock ist verankert und nicht magnetisch. Er bleibt fest.";
  if (tile === "#") return "Hier ist eine Wand.";
  if (tile === "v" && id === "bolt")
    return "Bolt ist zu breit. Nur Pip passt durch den Schacht.";
  if (tile === "D" && !isDoorOpen(s))
    return "Die Tür braucht Strom oder Bolt auf der Druckplatte.";
  if (s.crate && same(target, s.crate))
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
        "Geschafft! Raumziel erreicht. Weiter geht es über die Raumwahl. R startet neu, Z geht zurück.",
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
        `${NAMES[id]} hat den Anschluss verlassen. Die Stromverbindung ist gelöst.`;
    if (!reason && tileAt(target, s.room) === "P")
      message =
        id === "bolt"
          ? "Bolt hält die schwere Druckplatte. Die Tür bleibt offen — Pip kann nachkommen."
          : "Pip ist zu leicht für diese Druckplatte. Hier wird Bolt gebraucht.";
    if (!reason && tileAt(target, s.room) === "S")
      message = "Anschluss erreicht. Mit Strommodul und E verbinden.";
    const result = accept(
      { robots: { ...s.robots, [id]: nextRobot }, connected: nextConnected },
      message,
    );
    if (isWon(result.state))
      result.message =
        `Geschafft! ${ROOMS[s.room].title} ist gelöst. R: noch einmal · Z: zurück.`;
    return result;
  }
  if (robot.module === "power") {
    if (tileAt(robot, s.room) !== "S")
      return reject(
        "Das Strommodul braucht den Anschluss: auf das Ringfeld stellen und E drücken.",
      );
    const connected = s.connected === id ? null : id;
    return accept(
      { connected },
      connected
        ? "Strom verbunden. Die Tür ist offen. Shift wechselt den Buddy und lässt den Strom an."
        : "Strom gelöst. Eine schwere Druckplatte braucht Bolt, um die Tür offen zu halten.",
    );
  }
  const delta = DELTA[robot.facing];
  const front = { x: robot.x + delta.x, y: robot.y + delta.y };
  if (tileAt(front, s.room) === "O")
    return reject("Keine Magnetwirkung: Dieser Keramikblock ist am Boden verankert und nicht magnetisch.");
  if (!s.crate || !same(front, s.crate))
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
export type Command = Action | { type: "undo" } | { type: "restart" } | { type: "room"; room: RoomId };
export function newSession(room: RoomId = "tech"): Session {
  return {
    state: initialState(room),
    history: [],
    message:
      ROOMS[room].objective,
  };
}
export function dispatch(session: Session, command: Command): Session {
  if (command.type === "room") return newSession(command.room);
  if (command.type === "restart")
    return {
      ...newSession(session.state.room),
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
