# Shift Buddies

Chris’ Solo-Projekt für **Game Off 2026**, Motto **Shift**. Sechs kleine kooperative Werkstatträtsel in TypeScript und Phaser 3 für den PC-Browser. Pip und Bolt haben verschiedene Körper und tauschen Magnet und Batterie. Formen, Animationen und ein optionales Zuggeräusch entstehen im Code; keine externen Assets, Fonts oder neuen Dienste.

## Starten und prüfen

Node.js 24+ und npm (geprüft mit 24.22.1):

```bash
npm ci --cache .cache/npm
npm run dev -- --port 5173 --strictPort
npm test
npm run build
PLAYWRIGHT_BROWSERS_PATH=.cache/playwright npx playwright install chromium --only-shell
PLAYWRIGHT_BROWSERS_PATH=.cache/playwright npm run test:browser
```

Der Devserver bindet nur an Loopback. Für einen Produktionsbuild: `npm run preview -- --port 5173 --strictPort`. Falls Port 5173 bereits belegt ist, einen freien Port verwenden. Tests starten ihren eigenen Devserver auf 4174 und beenden ihn anschließend.

Live-Vorschau: **https://shift-buddies.clippmann.de/**. Der Ausbau vom 02.11.2026 einschließlich Update dieser Vorschau wurde ausdrücklich freigegeben. Weitere Deploys brauchen einen Auftrag. Kein itch.io-Release. Die aktuelle Sichtkorrektur und Live-Abnahme stehen im [Sichtreview](docs/2026-11-02-sichtreview.md), die sechs Lösungen im [Ausbaubericht](docs/2026-11-02-ausbau.md); die historischen Dreiraumbelege bleiben in `docs/` erhalten.

## Spielen

| Taste | Wirkung |
| --- | --- |
| WASD / Pfeile | Ein Feld fahren, dabei drehen; ein blockierter Versuch richtet den Bot aus |
| Shift | Roboter wechseln; eine Stromverbindung bleibt bestehen |
| T | Module zwischen direkt benachbarten Buddies tauschen; bestehende Verbindung lösen |
| E halten + Gegenrichtung | Mit Magnet rückwärts von der **benachbarten Kiste vor dem Bot** wegfahren; Blick bleibt zur Kiste |
| E mit Batterie | Auf einem Anschluss verbinden / lösen |
| Z / R | Letzte Zustandsänderung einschließlich Blickrichtung zurück / aktuellen Raum neu starten |
| Enter | Nur nach Sieg und mit vorhandenem Folgeraum weiter; alternativ Weiter anklicken |

**Magnet:** E allein zeigt Ziehbereitschaft und bewegt nichts. Beim Halten von E bewegen seitliche/vorwärts gerichtete Eingaben nichts und drehen den Bot nicht. E loslassen, neu zur Kiste ausrichten, wieder E halten und rückwärts fahren. Hinter dem Bot muss ein freies begehbares Feld liegen. Kein Schieben, kein diagonales Ziehen. Pro neuem Richtungstastendruck genau ein Feld; OS-Keyrepeat wird ignoriert. Loslassen, Fokus-/Fensterverlust, Shift, T, Z, R und Raumwahl löschen Ziehbereitschaft. Der E-Button erklärt diese Steuerung; er zieht keine Kiste und rastet nicht ein.

**Körper und Schaltkreise:** Pip passt durch schmale Gitter. Bolt und die Metallkiste drücken schwere Platten ein; Pip ist zu leicht. Die Batterie versorgt genau den Anschluss unter ihrem Träger, solange er verbunden stehen bleibt. Wegfahren, E oder Modultausch lösen sie. Leitungen und passende A/B-Bezeichnungen zeigen zugeordnete Türen. Türen schließen ohne Einrasten; ein Bot auf einer schließenden Tür darf sie verlassen. Eine Brücke bleibt bei Stromausfall über ihre ganze Spanne ausgefahren, solange ein Bot oder eine Kiste darauf steht. Nach dem Verlassen fährt sie ein; eine leere unversorgte Brücke und die Grube sind nicht begehbar. Kein Fallen, kein Zerstören.

Die Fahrdarstellung läuft 160 ms zwischen eindeutigen Rasterzuständen. Neue Aktionen beenden die vorherige Darstellung am gültigen Zielfeld, bevor sie ausgeführt werden; Undo/Restart/Raumwahl verwerfen die Darstellung. Es gibt keine versteckte Eingabeschlange. Reduzierte Bewegung schaltet Interpolation und Aktionsringe ab, auch bei einem Wechsel der Systemeinstellung. **Ton ist anfangs aus**; „Ton: an“ aktiviert nach Browserinteraktion ein kurzes leises synthetisches Zuggeräusch. Es gibt keinen Download und kein Autoplay.

## Die sechs Räume und ihre Lösungen

Alle Räume sind direkt anwählbar. Raumwahl beginnt neu und leert Undo, R bleibt im gewählten Raum. Raum 1 verlangt Pip am Ausgang und Bolt auf der Platte, Raum 2 Bolt am Ausgang und eine aktive Versorgung, danach jeweils beide auf den zwei grünen Ausgangsfeldern.

Die ausführbaren Lösungsfolgen in [tests/solution.ts](tests/solution.ts) sind zugleich Tastatureingaben der Browsertests. Koordinaten sind nullbasiert `x/y`. `×n` bedeutet n einzelne Tastendrücke. `E+←` heißt E halten, Pfeil links drücken, E loslassen.

1. **Klein & schwer:** `Shift →×2 Shift ↑×2 →×6`. Bolt hält `5/7`, Pip fährt durch den Schacht zum Ausgang `8/5`.
2. **Energie teilen:** `↑×3 →×2 E+← E+← ↓×4 T ↑×3 →×2 ↑ →×3 E Shift →×3`. Pip zieht die Kiste zweimal, tauscht mit Bolt und versorgt `8/2`; Bolt erreicht `7/6`.
3. **Technikraum:** `→ ↑×6 →×2 E+← E+←`; dann `↓×6 T ↑×5 →×2 ↑ →×3 E`; dann `Shift →×5 ↑ →×3`; dann `Shift E ←×3 ↓ ←×2 ↓×4 →×8 ↓×2 →×3`; schließlich `Shift →×3 ↓×2`. Erst Kiste räumen und Batterie für Pip, dann hält Bolt `12/7`, damit Pip nachkommen kann. Ausgänge `14/9` und `15/9`.
4. **Schwere Fracht:** `E+↓ →×7 ↓ Shift →×3 ↑ →×6 ↓`. Kiste von `5/4` auf Platte `5/5` ziehen, Pip zu `12/7`, Bolt zu `13/7`. Die Kiste hält die Tür, auch wenn Bolt geht.
5. **Getrennte Wege:** `↓×2 T ↑×4 E Shift →×4`; dann `Shift E ↓×4 →×4 T`; dann `Shift ↑ → ↑ E`; dann `Shift →×7 ↑ E+↓ ↓`; schließlich `Shift E ↓×2 →×3 ↓ →×3 ↓`. Pip versorgt A, Bolt hält Platte A; im Mittelraum Batterie an Bolt übergeben. Bolt versorgt B, Pip richtet sich durch den blockierten ↑-Versuch zur Kiste aus und zieht sie auf Platte B. Ausgänge `14/9` und `15/9`.
6. **Brückendienst:** `T ↑×2 → E Shift → ↑×2 →×4 ↓×4`; dann `Shift E ← ↓×4 →×5 ↑ →×5`; schließlich `Shift ↑ →×3 ↓ →`. Pip versorgt die Brücke `7/5`; Bolt quert und hält die Rückwegplatte `10/9`. Pip löst die Versorgung und kommt durch die untere Tür. Ausgänge `14/8` und `14/9`.

## Nachvollziehbarer Code

- `src/game/rules.ts`: Reine TypeScript-Zustände und Übergänge ohne DOM/Phaser/Timer. `ROOMS` enthält Layout und Lernziel. Gemeinsame `Circuit`-Daten verbinden Anschlüsse/Platten mit Türen/Brücken; keine raumspezifischen Bewegungsszenen. Die Brückensicherung wird aus der Belegung abgeleitet und ist dadurch zusammen mit Undo immer konsistent.
- `src/main.ts`: Eine Phaser-Scene, gemeinsame Modulformen, echte Chassis-Drehung, Fahrdarstellung, Eingaben und HTML-Anzeige. Eingabebereitschaft und Animation sind vorübergehende Darstellung, keine versteckten Puzzle-Zustände.
- `tests/rules.test.ts`: Lösungen und alle Undo-Snapshots, Körper/Module, Kollisionen, Ziehrichtung, Schaltkreiszuordnung, Brückensicherung und unabhängige Laufwegsuchen. Kein Beweis über jeden denkbaren Zustandsraum.
- `tests/browser.spec.ts`: Echte Tastatur-/Fokuseingaben, sechs Raumlösungen, Enter/Repeat, Ziehen/Release/Blur, Kontextwechsel während Animation, reduzierte Bewegung, Ton-Opt-in und Screenshots. Öffentlich wiederholbar mit `PLAYWRIGHT_BASE_URL=https://shift-buddies.clippmann.de`.
- `deploy/render-nginx.py` / `deploy/check-public.py`: Enger VHost mit exakten Builddateien und öffentliche TLS-/Hash-/Pfadprüfung. Immutable Releases und passender VHost-Rückfall bleiben erhalten.

Layoutzeichen: `#` Wand, `.` Boden, `v` Schacht, `S` Anschluss, `D` Tür, `P` schwere Platte, `X` Ausgang, `O` feste Keramik, `~` Grube, `B` elektrisch ausfahrbare Brücke. Roboter und optionale Metallkiste starten an separat angegebenen Positionen.

Bewusste Grenzen: keine Speicherung, Gegner, Inventare oder Touch-Bewegung. Headless-Chromium-Prüfung unter Linux ersetzt keinen menschlichen Spieltest. Firefox, Safari und itch.io-Einbettung sind noch offen. Die bekannte Vite-Warnung zur Phaser-Bundlegröße bleibt. Der Canvas ist noch nicht vollständig für Screenreader zugänglich.

MIT-Lizenz, Copyright (c) 2026 Chris; siehe [LICENSE](LICENSE). Abhängigkeiten behalten ihre Lizenzen.
