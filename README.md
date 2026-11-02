# Shift Buddies

Chris’ Solo-Projekt für **Game Off 2026**, Motto **Shift**. Ein kleiner spielbarer Technikraum mit TypeScript, Phaser 3 und Vite für den PC-Browser. Zwei Roboter müssen zusammen den Ausgang erreichen. Alle Formen entstehen im Code, ohne externe Assets, Fonts oder Dienste.

## Lokal starten

Voraussetzung: **Node.js 24+ mit npm**. Geprüft mit Node 24.22.1.

```bash
npm ci --cache .cache/npm
npm run dev -- --port 5173 --strictPort
```

Dann **http://127.0.0.1:5173/** öffnen. Der Server lauscht nur auf Loopback. Zum Stoppen im eigenen Terminal `Ctrl+C` drücken. Für einen bereits im Hintergrund gestarteten Abnahmeserver stehen PID und Log in `.cache/acceptance-server.pid` und `.cache/acceptance-server.log`.

Produktionsdateien erzeugen und lokal ansehen:

```bash
npm run build
npm run preview -- --port 5173 --strictPort
```

`dist/` enthält die gebauten öffentlichen Dateien. Der von Chris am 02.11.2026 ausdrücklich freigegebene Testraum ist unter **https://shift-buddies.clippmann.de/** erreichbar. Hosting, Quellstand, Prüfung, Wiederholung und Rückfall stehen in [docs/2026-11-02-deployment.md](docs/2026-11-02-deployment.md). Weitere Deployments brauchen einen Auftrag. Das spätere Ziel bleibt itch.io; dieser Prototyp ist noch kein fertiges Spiel.

## Spielen

Das Spielfeld erhält beim Start den Tastaturfokus. Nach einem Klick auf Text bei Bedarf wieder das Spielfeld anklicken. Ein Tastendruck entspricht einer Aktion; Gedrückthalten wiederholt keine Schritte.

| Taste         | Wirkung                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| WASD / Pfeile | Ein Rasterfeld gehen; bei einem Hindernis dorthin ausrichten                                                     |
| Shift         | Zwischen Pip und Bolt wechseln, ohne eine Stromverbindung zu lösen                                               |
| T             | Module tauschen, wenn beide direkt nebeneinander stehen; diagonal reicht nicht                                   |
| E mit Magnet  | Die Metallkiste direkt vor dem Roboter ein Feld zurückziehen. Hinter dem Roboter muss Platz sein. Kein Schieben. |
| E mit Strom   | Auf dem Anschluss verbinden oder lösen                                                                           |
| Z             | Letzte Zustandsänderung zurücknehmen, auch Ausrichtung, Wechsel, Modultausch, Verbindung und Sieg                |
| R             | Raum vollständig neu starten und Undo-Verlauf leeren                                                             |

**Pip** ist der kleine türkise Kreis und passt durch den schraffierten Schacht. **Bolt** ist das breite sandfarbene Quadrat und aktiviert die schwere Druckplatte. Der aktive Roboter hat einen weißen Rahmen und einen Marker; seine Karte zeigt „AKTIV“. Die Modulabzeichen zeigen `M` / Magnet oder `ϟ` / Strom.

Strom fließt nur, solange der Roboter mit Strommodul **auf dem Anschluss verbunden stehen bleibt**. Weggehen oder E löst die Verbindung. Der Roboterwechsel lässt sie bestehen. Die Tür ist offen, solange Strom anliegt **oder Bolt auf der Druckplatte steht**. Pip und die Kiste können die schwere Platte nicht halten. Die Tür rastet nicht ein; beim Schließen wird kein Roboter zerstört. Z und R helfen auch aus Sackgassen.

Gewonnen ist erst, wenn **beide Roboter auf den beiden grünen Ausgangsfeldern** stehen.

## Nachvollziehbarer Lösungsweg

Koordinaten sind nullbasiert `x / y`, wie auf den Roboterkarten. Die folgende Folge startet mit R. `×6` bedeutet sechs einzelne Tastendrücke. Sie enthält **71 Aktionen**, keine abgewiesenen Versuche.

| Schritt                        | Eingaben                            | Ergebnis                                                                                                      |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1. Platz schaffen              | `→ ↑×6 →×2 E E`                     | Pip zieht mit Magnet die Kiste von `6/2` nach `4/2`; Pip steht `3/2`.                                         |
| 2. Tauschen, Strom anschließen | `↓×6 T ↑×5 →×2 ↑ →×3 E`             | T neben Bolt auf `4/8`; Pip trägt danach Strom. Über die kleine Ausweichnische zu Anschluss `8/2`, verbunden. |
| 3. Bolt übernimmt              | `Shift →×5 ↑ →×3`                   | Bolt durch die offene Tür auf Druckplatte `12/7`. Pip versorgt dabei weiter.                                  |
| 4. Pip nachholen               | `Shift E ←×3 ↓ ←×2 ↓×4 →×8 ↓×2 →×3` | Pip löst sich, geht durch den Schacht und durch die von Bolt offengehaltene Tür bis Ausgang `14/9`.           |
| 5. Gemeinsam hinaus            | `Shift →×3 ↓×2`                     | Bolt verlässt die Platte und erreicht `15/9`. Die Tür schließt hinter beiden; geschafft.                      |

Warum beide Körper und Module nötig sind: Der Schacht ist der einzige Zugang zum Anschluss. Die Kiste sperrt dessen schmalen Gang; erst nach zweimaligem Zurückziehen ist die Ausweichnische nutzbar. Bolt kann den Anschluss auch mit Strommodul nicht erreichen. Pip muss deshalb nach dem Ziehen zurück zum Modultausch. Hinter der Tür muss Bolt die Versorgung mit der Platte übernehmen, damit Pip sich lösen und nachkommen kann. Wer mit Bolt direkt zum Ausgang läuft, lässt Pip vor der wieder geschlossenen Tür zurück.

## Prüfen

Der tatsächliche Prüfstand dieses Auftrags steht in [docs/2026-11-02-abnahme.md](docs/2026-11-02-abnahme.md).

```bash
npm run typecheck
npm test
npm run build

# Einmalig den Testbrowser projektlokal herunterladen:
PLAYWRIGHT_BROWSERS_PATH=.cache/playwright npx playwright install chromium --only-shell
PLAYWRIGHT_BROWSERS_PATH=.cache/playwright npm run test:browser

# Denselben Browsertest gegen den veröffentlichten Raum ausführen,
# ohne lokalen Server und ohne Zertifikatsprüfung zu umgehen:
PLAYWRIGHT_BASE_URL=https://shift-buddies.clippmann.de \
  PLAYWRIGHT_BROWSERS_PATH=.cache/playwright npm run test:browser
```

Die elf Regeltests prüfen den gesamten Lösungsweg, alle 71 Undo-Snapshots, Neustart, Schacht/Platte, Magnetbedingungen, Tauschabstand, Kollisionen und die dauerhafte Stromverbindung. Eine unabhängige Flood-Fill-Prüfung sucht Laufwege um die vorgesehenen Sperren. Sie ist keine erschöpfende Suche über alle denkbaren Aktionen.

Die zwei Playwright-Tests starten ihren eigenen Loopback-Testserver auf Port 4174. Sie bedienen das Spiel über echte Tastatureingaben und sichtbare Buttons: kompletter Lösungsweg, Stromerhalt bei Shift, vollständiges Undo, Neustart, Fokus und schmaleres Fenster. Der Browser wird anschließend geschlossen. Screenshots liegen lokal unter `.cache/technikraum-start.png` und `.cache/technikraum-geloest.png`; Fehlerartefakte unter `test-results/`.

Getestet wird Chromium headless unter Linux. Ein sichtbarer manueller Durchlauf durch Chris sowie Firefox, Safari, Mobilgeräte und itch.io-Einbettung stehen noch aus. Mausbuttons ergänzen die Tastatur; eine Touch-Bewegungssteuerung ist nicht enthalten. Vite weist auf das große Phaser-Bundle hin (rund 1,21 MB / 324 kB gzip); für diesen einzelnen lokalen Testraum ist das akzeptiert.

## Kleine Lernhilfe: Wo anfangen?

- **`src/game/rules.ts`** ist das eigentliche Spiel als reine TypeScript-Funktionen. `State` beschreibt Roboter, Kiste, aktive Figur und Verbindung. `transition(state, action)` berechnet den nächsten Zustand, ohne den alten zu verändern. `dispatch` ergänzt Undo und Neustart.
- **`src/main.ts`** übersetzt Tastendrücke in Aktionen und zeichnet den Zustand mit einer einzigen Phaser-Scene. Phaser kümmert sich hier um Canvas und Eingaben; wir brauchen noch keine Physik, Spritesheets oder Szenenverwaltung. Die HTML-Anzeige liest denselben Zustand wie das Spielfeld.
- **`src/style.css` und `index.html`** gestalten die Karten, Steuerung und deutsche Hilfe neben dem Canvas.
- **`tests/solution.ts`** enthält die Lösung als kleine Aktionsfolgen. Regeltest und Browsertest führen dieselben Eingaben über unterschiedliche Ebenen aus.
- **`tests/rules.test.ts`** lässt sich ohne Phaser oder Browser ausführen: Node 24 versteht diese TypeScript-Dateien direkt; `tsc` prüft separat die Typen.

Ein guter erster Lernschritt: `initialState()` lesen, eine Bewegung durch `transition` verfolgen, dann den zugehörigen Regeltest ansehen. Zum Layoutlesen: Jede Zeichenfolge in `ROOM` ist eine Zeile; `#` Wand, `.` Boden, `v` Schacht, `S` Anschluss, `D` Tür, `P` Platte, `X` Ausgang. Die Anfangsposition der Kiste liegt separat im Zustand. Bei Layoutänderungen immer den Lösungsweg und die Sperren erneut prüfen.

Bewusst begrenzt: ein Raum, keine Speicherung über Neuladen, keine Sounds, keine Animationen, keine weiteren Level. Undo-Verlauf lebt nur im aktuellen Browserlauf. Die Canvas-Darstellung ist noch nicht vollständig für Screenreader zugänglich.

## Lizenz

MIT-Lizenz, Copyright (c) 2026 Chris. Siehe [LICENSE](LICENSE). Abhängigkeiten behalten ihre jeweiligen Lizenzen.
