import Phaser from "phaser";
import "./style.css";
import {
  ROOM,
  ROOMS,
  ROOM_ORDER,
  NAMES,
  dispatch,
  newSession,
  isPowered,
  isPlateHeld,
  isDoorOpen,
  isWon,
  tileAt,
} from "./game/rules.ts";
import type {
  Command,
  Direction,
  RobotId,
  Session,
  State,
  Module,
  RoomId,
} from "./game/rules.ts";

const TILE = 50;
const COLORS = {
  floor: 0x152638,
  wall: 0x223246,
  line: 0x31465b,
  pip: 0x81e4cf,
  bolt: 0xe6b579,
  magnet: 0xffa0aa,
  power: 0xffe290,
};
const element = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
const gameElement = element("game");
let session: Session = newSession("bodies");

function updateHud(): void {
  const s = session.state;
  element("feedback").textContent = session.message;
  element("move-count").textContent = `${s.actions} Aktionen`;
  element("door-status").textContent =
    `TÜR ${isDoorOpen(s) ? "OFFEN" : "ZU"} · ${isPowered(s) ? "Strom verbunden" : isPlateHeld(s) ? "Bolt hält die Platte" : "Keine Versorgung"}`;
  element<HTMLButtonElement>("undo").disabled = session.history.length === 0;
  element("robots").innerHTML = (["pip", "bolt"] as RobotId[])
    .map((id) => {
      const r = s.robots[id];
      return `<section class="robot-card ${s.active === id ? "active" : ""}" data-testid="robot-${id}" data-x="${r.x}" data-y="${r.y}" data-module="${r.module}" data-connected="${s.connected === id}"><div class="robot-top"><span class="robot-name">${id === "pip" ? "●" : "■"} ${NAMES[id]}</span><span class="active-tag">${s.active === id ? "AKTIV · SHIFT ↔" : "BUDDY"}</span></div><p>${id === "pip" ? "Kleiner Körper · passt durch Schächte" : "Schwerer Körper · hält Druckplatten"}</p><span class="module ${r.module}">${r.module === "magnet" ? "∪ · Hufeisenmagnet" : "⚡ · Batterie"}${s.connected === id ? " · verbunden" : ""}</span><span class="coords">Feld ${r.x} / ${r.y}</span></section>`;
    })
    .join("");
  const room = ROOMS[s.room];
  gameElement.dataset.room = s.room;
  element("room-title").textContent = room.title;
  element<HTMLSelectElement>("room-select").value = s.room;
  element("mission-title").textContent = "Deine Aufgabe";
  element("objective").textContent = isWon(s) ? "Geschafft! Du kannst weitergehen oder den Raum erneut probieren." : room.objective;
  element("room-hint").textContent = room.hint;
  const goals: [boolean, string][] = s.room === "bodies"
    ? [[tileAt(s.robots.pip, s.room) === "X", "Pip am Ausgang"], [isPlateHeld(s), "Bolt hält die schwere Platte"]]
    : s.room === "modules"
      ? [[isPowered(s), "Anschluss versorgt"], [tileAt(s.robots.bolt, s.room) === "X", "Bolt am Ausgang"]]
      : [[tileAt(s.robots.pip, s.room) === "X", "Pip am Ausgang"], [tileAt(s.robots.bolt, s.room) === "X", "Bolt am Ausgang"]];
  element("progress").innerHTML = goals.map(([done, text]) => `<li class="${done ? "done" : ""}">${text}</li>`).join("");
  element<HTMLButtonElement>("next-room").hidden = !isWon(s) || s.room === "tech";

}

class RoomScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  create(): void {
    this.graphics = this.add.graphics();
    this.redraw();
    updateHud();
    const keys: Record<string, Direction> = {
      ArrowUp: "up",
      KeyW: "up",
      ArrowDown: "down",
      KeyS: "down",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
    };
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey)
        return;
      if (
        document.activeElement !== gameElement &&
        document.activeElement !== document.body
      )
        return;
      let command: Command | undefined;
      if (keys[event.code])
        command = { type: "move", direction: keys[event.code] };
      else if (event.code === "ShiftLeft" || event.code === "ShiftRight")
        command = { type: "switch" };
      else if (event.code === "KeyE") command = { type: "interact" };
      else if (event.code === "KeyT") command = { type: "swap" };
      else if (event.code === "KeyZ") command = { type: "undo" };
      else if (event.code === "KeyR") command = { type: "restart" };
      if (command) {
        event.preventDefault();
        this.act(command);
      }
    });
    for (const id of ["switch", "interact", "swap", "undo", "restart"] as const) {
      element(id).addEventListener("click", () => {
        this.act({ type: id });
        gameElement.focus({ preventScroll: true });
      });
    }
    element("room-select").addEventListener("change", () => {
      this.act({ type: "room", room: element<HTMLSelectElement>("room-select").value as RoomId });
      gameElement.focus({ preventScroll: true });
    });
    element("next-room").addEventListener("click", () => {
      const next = ROOM_ORDER[ROOM_ORDER.indexOf(session.state.room) + 1];
      if (next && isWon(session.state)) this.act({ type: "room", room: next });
      gameElement.focus({ preventScroll: true });
    });
    gameElement.addEventListener("pointerdown", () =>
      gameElement.focus({ preventScroll: true }),
    );
    gameElement.dataset.ready = "true";
    gameElement.focus({ preventScroll: true });
  }

  private act(command: Command): void {
    const before = session.state;
    session = dispatch(session, command);
    updateHud();
    this.redraw();
    if (session.state !== before && (command.type === "swap" || command.type === "interact"))
      this.reaction(before, command);
  }

  private text(
    x: number,
    y: number,
    value: string,
    color = "#b5c9d7",
    size = 12,
  ): void {
    this.labels.push(
      this.add
        .text(x, y, value, {
          fontFamily: "system-ui, sans-serif",
          fontSize: size,
          color,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
  }

  private redraw(): void {
    this.graphics.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    const g = this.graphics;
    const s = session.state;
    ROOMS[s.room].grid.forEach((row, y) =>
      [...row].forEach((tile, x) => {
        const px = x * TILE;
        const py = y * TILE;
        g.fillStyle(tile === "#" ? COLORS.wall : COLORS.floor).fillRect(
          px,
          py,
          TILE,
          TILE,
        );
        g.lineStyle(1, tile === "#" ? 0x26384c : 0x1f364b).strokeRect(
          px + 1,
          py + 1,
          TILE - 2,
          TILE - 2,
        );
        if (tile === "#") {
          g.fillStyle(0x2d4055).fillRect(px + 9, py + 10, 5, 3);
          return;
        }
        if (tile === "v") {
          // 26 px opening: Pip's 22 px wheels fit, Bolt's 44 px tracks don't.
          g.fillStyle(0x637c80).fillRect(px + 1, py, 11, TILE).fillRect(px + 38, py, 11, TILE);
          g.lineStyle(2, 0xa3c3bd);
          for (let i = 5; i < TILE; i += 9)
            g.lineBetween(px + 13, py + i, px + 37, py + i);
        }
        if (tile === "S") {
          g.lineStyle(3, COLORS.power).strokeCircle(px + 25, py + 25, 17);
          g.fillStyle(isPowered(s) ? COLORS.power : 0x6e684e).fillCircle(
            px + 25,
            py + 25,
            7,
          );
          this.text(px + 25, py - 10, "ANSCHLUSS", "#ffe290", 10);
        }
        if (tile === "D") {
          const color = isDoorOpen(s) ? 0x81e4cf : 0xfa9b88;
          g.fillStyle(color, 0.18).fillRect(px, py, TILE, TILE);
          g.lineStyle(4, color)
            .lineBetween(px + 2, py + 2, px + 48, py + 2)
            .lineBetween(px + 2, py + 48, px + 48, py + 48);
          if (!isDoorOpen(s))
            for (let i = 11; i < 49; i += 12)
              g.lineBetween(px + i, py + 5, px + i, py + 45);
        }
        if (tile === "P") {
          g.fillStyle(isPlateHeld(s) ? 0x32685e : 0x605444).fillRoundedRect(
            px + 5,
            py + 8,
            40,
            35,
            4,
          );
          g.lineStyle(
            2,
            isPlateHeld(s) ? COLORS.pip : COLORS.bolt,
          ).strokeRoundedRect(px + 5, py + 8, 40, 35, 4);
          // Twin track imprints match Bolt's broad undercarriage.
          g.fillStyle(COLORS.bolt).fillRoundedRect(px + 8, py + 12, 9, 27, 3).fillRoundedRect(px + 33, py + 12, 9, 27, 3);
          g.lineStyle(2, 0x221f25).lineBetween(px + 12, py + 18, px + 12, py + 33).lineBetween(px + 38, py + 18, px + 38, py + 33);
        }
        if (tile === "O") {
          // Chamfered ceramic, crack, and four anchors; never the metal crate silhouette.
          g.fillStyle(0x9b8b78).fillPoints([
            new Phaser.Geom.Point(px + 13, py + 6), new Phaser.Geom.Point(px + 37, py + 6),
            new Phaser.Geom.Point(px + 44, py + 16), new Phaser.Geom.Point(px + 44, py + 35),
            new Phaser.Geom.Point(px + 35, py + 44), new Phaser.Geom.Point(px + 13, py + 44),
            new Phaser.Geom.Point(px + 6, py + 34), new Phaser.Geom.Point(px + 6, py + 16),
          ], true);
          g.lineStyle(2, 0x574c45).lineBetween(px + 17, py + 13, px + 27, py + 24).lineBetween(px + 27, py + 24, px + 21, py + 34).lineBetween(px + 27, py + 24, px + 36, py + 20);
          for (const dx of [7, 43]) for (const dy of [7, 43]) {
            g.fillStyle(0x111e2c).fillRect(px + dx - 3, py + dy - 3, 6, 6);
            g.lineStyle(1, 0xb5a68f).lineBetween(px + dx - 4, py + dy, px + dx + 4, py + dy);
          }
        }
        if (tile === "X") {
          g.fillStyle(0x295b50).fillRect(px + 2, py + 2, 46, 46);
          g.lineStyle(2, COLORS.pip).strokeRect(px + 5, py + 5, 40, 40);
          this.text(px + 25, py + 25, "→", "#81e4cf", 26);
        }
      }),
    );
    this.text(425, 43, ROOMS[s.room].title.toUpperCase(), "#d9e7ef", 18);
    this.text(425, 70, s.room === "tech" ? "Körper und Module zusammen einsetzen." : "Ein kurzer Raum zum Ausprobieren.", "#a3b8c9", 12);
    if (s.room === "tech") {
      this.text(225, 317, "WERKSTATT / MODULTAUSCH", "#7795ac", 12);
      this.text(78, 225, "SCHACHT →", "#aecdc7", 11);
      this.text(630, 325, "SCHWERE PLATTE", "#e6b579", 11);
      this.text(746, 447, "AUSGANG", "#81e4cf", 11);
    } else if (s.room === "bodies") {
      this.text(265, 225, "SCHMALER SCHACHT", "#aecdc7", 11);
      this.text(310, 425, "SCHWERE PLATTE", "#e6b579", 11);
      this.text(510, 275, "← AUSGANG", "#81e4cf", 11);
    } else {
      this.text(65, 275, "FEST →", "#c5b69e", 10);
      this.text(384, 375, "AUSGANG ↑", "#81e4cf", 11);
    }
    if (s.crate) {
      const cx = s.crate.x * TILE + 25;
      const cy = s.crate.y * TILE + 25;
      g.fillStyle(0x6f899a).fillRoundedRect(cx - 20, cy - 20, 40, 40, 3);
      g.lineStyle(2, 0xd3e0e7).strokeRoundedRect(cx - 20, cy - 20, 40, 40, 3);
      g.lineStyle(2, 0x344a5b).lineBetween(cx - 17, cy - 12, cx + 17, cy - 12).lineBetween(cx - 17, cy + 13, cx + 17, cy + 13);
      for (const dx of [-15, 15]) for (const dy of [-15, 15])
        g.fillStyle(0xe1ebef).fillCircle(cx + dx, cy + dy, 2);
      this.drawModule(cx, cy, "magnet");
    }
    for (const id of ["pip", "bolt"] as RobotId[]) this.drawRobot(s, id);
    if (isWon(s)) {
      // Phaser text objects render above Graphics; hide floor annotations
      // before adding the victory text so they cannot cross the dialog.
      this.labels.forEach((label) => label.setVisible(false));
      g.fillStyle(0x0b1c29, 0.96).fillRoundedRect(150, 240, 550, 150, 18);
      g.lineStyle(2, COLORS.pip).strokeRoundedRect(150, 240, 550, 150, 18);
      this.text(425, 280, "ZUSAMMEN GESCHAFFT!", "#81e4cf", 27);
      this.text(
        425,
        321,
        `${ROOMS[s.room].title} ist gelöst.`,
        "#eaf0f5",
        17,
      );
      this.text(
        425,
        357,
        "R  Noch einmal     ·     Z  Letzten Schritt zurück",
        "#a5b9c9",
        13,
      );
    }
  }

  // The same physical module shapes are used on bots and on magnetic metal.
  private drawModule(x: number, y: number, module: Module): void {
    const g = this.graphics;
    if (module === "magnet") {
      g.lineStyle(5, 0xd8e5ec).beginPath().moveTo(x - 6, y - 6)
        .lineTo(x - 6, y + 2).arc(x, y + 2, 6, Math.PI, 0, true)
        .lineTo(x + 6, y - 6).strokePath();
      g.fillStyle(0xff818e).fillRect(x - 9, y - 9, 6, 6);
      g.fillStyle(0x89caff).fillRect(x + 3, y - 9, 6, 6);
      // One striped pole also distinguishes poles without relying on color.
      g.lineStyle(1, 0xffffff).lineBetween(x + 4, y - 7, x + 8, y - 7);
    } else {
      g.fillStyle(0x131e2a).fillRoundedRect(x - 8, y - 9, 16, 20, 2);
      g.lineStyle(2, COLORS.power).strokeRoundedRect(x - 8, y - 9, 16, 20, 2);
      g.fillStyle(0xe7edf0).fillRect(x - 4, y - 12, 8, 3);
      g.fillStyle(COLORS.power).fillPoints([
        new Phaser.Geom.Point(x + 2, y - 7), new Phaser.Geom.Point(x - 5, y + 2),
        new Phaser.Geom.Point(x, y + 2), new Phaser.Geom.Point(x - 2, y + 8),
        new Phaser.Geom.Point(x + 5, y - 1), new Phaser.Geom.Point(x, y - 1),
      ], true);
    }
  }

  private drawRobot(s: State, id: RobotId): void {
    const r = s.robots[id];
    const g = this.graphics;
    const x = r.x * TILE + 25;
    const y = r.y * TILE + 25;
    if (s.connected === id) {
      g.lineStyle(3, COLORS.power).strokeCircle(x, y, 24);
      g.lineStyle(3, COLORS.power).lineBetween(x + 11, y - 10, x + 20, y - 10);
    }
    if (s.active === id) {
      g.lineStyle(2, 0xffffff).strokeRoundedRect(x - 24, y - 24, 48, 48, 5);
      g.fillStyle(0xffffff).fillTriangle(x - 22, y - 22, x - 14, y - 22, x - 22, y - 14);
    }
    const pip = id === "pip";
    g.fillStyle(0x08111b);
    if (pip) {
      g.fillRoundedRect(x - 11, y + 7, 5, 13, 2).fillRoundedRect(x + 6, y + 7, 5, 13, 2);
      g.lineStyle(1, 0x93b4b9).lineBetween(x - 9, y + 10, x - 9, y + 17).lineBetween(x + 9, y + 10, x + 9, y + 17);
    } else {
      g.fillRoundedRect(x - 22, y + 1, 11, 21, 4).fillRoundedRect(x + 11, y + 1, 11, 21, 4);
      g.lineStyle(2, 0xad926d);
      for (let dy = 5; dy < 22; dy += 5)
        g.lineBetween(x - 21, y + dy, x - 12, y + dy).lineBetween(x + 12, y + dy, x + 21, y + dy);
    }
    g.fillStyle(COLORS[id]).fillRoundedRect(x - (pip ? 8 : 16), y + 1, pip ? 16 : 32, pip ? 16 : 18, pip ? 6 : 3);
    g.fillStyle(0x102532).fillRoundedRect(x - (pip ? 6 : 11), y + 4, pip ? 12 : 22, 7, 2);
    g.fillStyle(0xe7fcff).fillRect(x - 4, y + 6, 2, 2).fillRect(x + 2, y + 6, 2, 2);
    g.lineStyle(3, 0xa3b4c2).lineBetween(x, y + 1, x, y - 4);
    this.drawModule(x, y - 10, r.module);
    // A separate compass at top right stays clear of the central module,
    // lower body, and top-left active marker in all four directions.
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[r.facing];
    const fx = x + 18 + dx * 3, fy = y - 13 + dy * 3;
    g.fillStyle(0xffffff).fillTriangle(fx + dx * 2, fy + dy * 2,
      fx - dx * 3 + dy * 3, fy - dy * 3 - dx * 3,
      fx - dx * 3 - dy * 3, fy - dy * 3 + dx * 3);
  }

  private reaction(before: State, command: Command): void {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const effect = this.add.graphics().setDepth(10);
    const robots = command.type === "swap" ? ["pip", "bolt"] as const : [before.active];
    for (const id of robots) {
      const r = session.state.robots[id];
      effect.lineStyle(3, command.type === "swap" ? 0xffffff : COLORS[before.robots[id].module], 0.85)
        .strokeCircle(r.x * TILE + 25, r.y * TILE + 25, 22);
    }
    this.tweens.add({ targets: effect, alpha: 0, duration: 450, onComplete: () => effect.destroy() });
  }

}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: ROOM[0].length * TILE,
  height: ROOM.length * TILE,
  backgroundColor: "#101c2b",
  scene: RoomScene,
  render: { antialias: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { keyboard: true },
});
