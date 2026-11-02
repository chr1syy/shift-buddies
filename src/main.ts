import Phaser from "phaser";
import "./style.css";
import {
  ROOM,
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
let session: Session = newSession();

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
      return `<section class="robot-card ${s.active === id ? "active" : ""}" data-testid="robot-${id}" data-x="${r.x}" data-y="${r.y}" data-module="${r.module}" data-connected="${s.connected === id}"><div class="robot-top"><span class="robot-name">${id === "pip" ? "●" : "■"} ${NAMES[id]}</span><span class="active-tag">${s.active === id ? "AKTIV · SHIFT ↔" : "BUDDY"}</span></div><p>${id === "pip" ? "Kleiner Körper · passt durch Schächte" : "Schwerer Körper · hält Druckplatten"}</p><span class="module ${r.module}">${r.module === "magnet" ? "M · Magnet" : "⚡ · Strom"}${s.connected === id ? " · verbunden" : ""}</span><span class="coords">Feld ${r.x} / ${r.y}</span></section>`;
    })
    .join("");
  const crateCleared = s.crate.x <= 4;
  const bothAcross = s.robots.pip.x > 10 && s.robots.bolt.x > 10;
  const milestones: [boolean, string][] = [
    [crateCleared, "Pip zieht die Metallkiste zurück"],
    [s.robots.pip.module === "power", "Nebeneinander Module tauschen"],
    [
      isPowered(s) || isPlateHeld(s) || bothAcross,
      "Pip versorgt den Anschluss",
    ],
    [isPlateHeld(s) || bothAcross, "Bolt übernimmt mit der Druckplatte"],
    [isWon(s), "Beide erreichen die grünen Ausgangsfelder"],
  ];
  element("progress").innerHTML = milestones
    .map(([done, text]) => `<li class="${done ? "done" : ""}">${text}</li>`)
    .join("");
  element("objective").textContent = isWon(s)
    ? "Geschafft! Körper und Module haben zusammengearbeitet."
    : bothAcross
      ? "Jetzt beide Roboter auf die zwei grünen Felder stellen."
      : isPlateHeld(s)
        ? "Bolt stehen lassen. Pip mit E vom Anschluss lösen und durch die Tür nachholen."
        : isPowered(s)
          ? "Mit Shift zu Bolt. Durch die Tür und auf die schwere Druckplatte gehen."
          : s.robots.pip.module === "power"
            ? "Pip zurück durch den Schacht. Auf dem Anschluss mit E verbinden."
            : crateCleared
              ? "Pip zurück zu Bolt bringen. Direkt nebeneinander mit T die Module tauschen."
              : "Pip hat den Magneten. Durch den Schacht zur Kiste: nach rechts ausrichten und zweimal mit E zurückziehen.";
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
    for (const id of ["interact", "swap", "undo", "restart"] as const) {
      element(id).addEventListener("click", () => {
        this.act({ type: id });
        gameElement.focus({ preventScroll: true });
      });
    }
    gameElement.addEventListener("pointerdown", () =>
      gameElement.focus({ preventScroll: true }),
    );
    gameElement.dataset.ready = "true";
    gameElement.focus({ preventScroll: true });
  }

  private act(command: Command): void {
    session = dispatch(session, command);
    updateHud();
    this.redraw();
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
    ROOM.forEach((row, y) =>
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
          g.fillStyle(0x314447).fillRect(px + 4, py, TILE - 8, TILE);
          g.lineStyle(3, 0x91b7b0);
          for (let i = 7; i < TILE; i += 10)
            g.lineBetween(px + 8, py + i, px + 41, py + i);
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
          for (let i = 14; i <= 36; i += 11)
            g.fillStyle(COLORS.bolt).fillRect(px + i, py + 17, 4, 17);
        }
        if (tile === "X") {
          g.fillStyle(0x295b50).fillRect(px + 2, py + 2, 46, 46);
          g.lineStyle(2, COLORS.pip).strokeRect(px + 5, py + 5, 40, 40);
          this.text(px + 25, py + 25, "→", "#81e4cf", 26);
        }
      }),
    );
    this.text(245, 43, "01   /   DER TECHNIKRAUM", "#d9e7ef", 18);
    this.text(
      245,
      70,
      "Erst Platz schaffen. Dann Energie teilen.",
      "#a3b8c9",
      12,
    );
    this.text(225, 317, "WERKSTATT / MODULTAUSCH", "#7795ac", 12);
    this.text(78, 225, "SCHACHT →", "#aecdc7", 11);
    this.text(630, 325, "SCHWERE PLATTE", "#e6b579", 11);
    this.text(746, 447, "AUSGANG", "#81e4cf", 11);
    const cx = s.crate.x * TILE + 25;
    const cy = s.crate.y * TILE + 25;
    g.fillStyle(0x65788e).fillRoundedRect(cx - 20, cy - 20, 40, 40, 4);
    g.lineStyle(2, 0xb6c9d8).strokeRoundedRect(cx - 20, cy - 20, 40, 40, 4);
    g.lineBetween(cx - 14, cy - 14, cx + 14, cy + 14).lineBetween(
      cx + 14,
      cy - 14,
      cx - 14,
      cy + 14,
    );
    for (const id of ["pip", "bolt"] as RobotId[]) this.drawRobot(s, id);
    if (isWon(s)) {
      g.fillStyle(0x0b1c29, 0.96).fillRoundedRect(150, 240, 550, 150, 18);
      g.lineStyle(2, COLORS.pip).strokeRoundedRect(150, 240, 550, 150, 18);
      this.text(425, 280, "ZUSAMMEN GESCHAFFT!", "#81e4cf", 27);
      this.text(
        425,
        321,
        "Pip + Bolt · Der Technikraum ist gelöst.",
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

  private drawRobot(s: State, id: RobotId): void {
    const r = s.robots[id];
    const g = this.graphics;
    const x = r.x * TILE + 25;
    const y = r.y * TILE + 25;
    const color = COLORS[id];
    if (s.connected === id && tileAt(r) === "S") {
      g.lineStyle(4, COLORS.power).strokeCircle(x, y, 23);
      g.lineStyle(3, COLORS.power).lineBetween(x, y - 25, x, y - 37);
    }
    if (s.active === id) {
      g.lineStyle(2, 0xffffff).strokeRoundedRect(x - 23, y - 23, 46, 46, 9);
      g.fillStyle(0xffffff).fillTriangle(
        x - 5,
        y - 33,
        x + 5,
        y - 33,
        x,
        y - 26,
      );
    }
    g.fillStyle(0x071421, 0.8).fillEllipse(x, y + 17, 37, 11);
    g.fillStyle(color);
    if (id === "pip") g.fillCircle(x, y, 16);
    else g.fillRoundedRect(x - 19, y - 17, 38, 35, 5);
    g.fillStyle(0x102532).fillRoundedRect(x - 11, y - 8, 22, 10, 3);
    g.fillStyle(0xe7fcff)
      .fillRect(x - 7, y - 5, 4, 4)
      .fillRect(x + 3, y - 5, 4, 4);
    this.text(x, y + 10, id === "pip" ? "P" : "B", "#102532", 10);
    const badgeColor = COLORS[r.module];
    g.fillStyle(0x142131).fillCircle(x + 17, y - 17, 11);
    g.lineStyle(2, badgeColor).strokeCircle(x + 17, y - 17, 10);
    this.text(
      x + 17,
      y - 17,
      r.module === "magnet" ? "M" : "ϟ",
      r.module === "magnet" ? "#ffa0aa" : "#ffe290",
      12,
    );
    const facing = {
      up: [0, -17],
      down: [0, 18],
      left: [-18, 0],
      right: [18, 0],
    }[r.facing];
    g.fillStyle(0xffffff).fillCircle(x + facing[0], y + facing[1], 3);
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
