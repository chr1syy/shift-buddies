# Shift Buddies

Chris’ Solo-Projekt für **Game Off 2026**, Motto **Shift**. Sechs kleine kooperative Werkstatträtsel in TypeScript und Phaser 3 für den PC-Browser auf itch.io. Pip und Bolt behalten ihre Körper und tauschen Magnet und Batterie. Formen, Bewegung und optionales Zug-/Schiebegeräusch entstehen im Code; keine externen Assets, Fonts oder zusätzlichen Dienste.

## Starten und Compiler prüfen

Node.js 24+ und npm:

```bash
npm ci --cache .cache/npm
npm run dev -- --port 5173 --strictPort
npm run typecheck
npm run build
```

Devserver und `npm run preview -- --port 5173 --strictPort` binden an Loopback. Einen anderen freien Port verwenden, falls 5173 belegt ist.

**Aktueller Spielstand geprüft und live:** https://shift-buddies.clippmann.de/ zeigt das Modultausch-/Kooperationspaket **`cf33fb3dd55da93b229cca2954b7dfcfec120f4e`**. Chris hat Prüfung und Update dieser bestehenden Vorschau ausdrücklich beauftragt. 29 Regeltests, Typecheck/Build und jeweils acht lokale Produktions-/öffentliche Chromium-Browsertests bestanden. Die Spielquellen blieben unverändert; alte Testlösungen wurden angepasst. [Release, Belege, Rückfall und Grenzen](docs/2026-11-02-deployment-kooperation.md).

```bash
npm test
npm run test:browser
```

Der Standard-Browsertest startet einen lokalen Devserver. Die Releaseabnahme lief gegen einen stabilen Produktionsbuild und anschließend die öffentliche HTTPS-Adresse. Weitere Deploys und itch.io-Veröffentlichung brauchen einen Auftrag. Historische Releaseberichte in `docs/` gelten für ihre jeweiligen SHAs.

## Spielen

| Taste | Wirkung |
| --- | --- |
| WASD / Pfeile | Ein Feld fahren und ausrichten; auch ein blockierter Versuch dreht den Bot |
| Shift | Gesteuerten Bot wechseln; eine Stromverbindung bleibt bestehen |
| T | Magnet und Batterie zwischen direkt benachbarten Bots tauschen; Verbindung lösen |
| E halten + rückwärts | Mit Magnet die benachbarte Kiste **vor dem Bot** ziehen; Blick bleibt zur Kiste |
| E halten + vorwärts | **Bolt** schiebt die Kiste vor sich mit Körperkraft, mit Magnet **oder** Batterie |
| E mit Batterie | Auf einem Anschluss verbinden / lösen |
| Z / R | Letzte Zustandsänderung einschließlich Blick zurück / gewählten Raum neu starten |
| Enter | Nach Sieg zum vorhandenen Folgeraum; alternativ Weiter anklicken |

**Erst ausrichten, dann E halten.** Der weiße Nasenpfeil, das Gesicht und der Pfeil auf der Roboterkarte zeigen vorwärts. Magnetisches E alleine bewegt nichts. Seitwärts wird bei gehaltenem E weder gefahren noch gedreht; Pip kann auch vorwärts nicht schieben. E loslassen zum Drehen. Normales Gegen-die-Kiste-Fahren schiebt nie automatisch. Pro neuem Richtungstastendruck genau ein Feld, kein OS-Keyrepeat. E mit Bolts Batterie schaltet auf einem Sockel weiterhin die Versorgung; gehaltenes E erlaubt zusätzlich bewusstes Vorwärtsschieben. Ohne Magnet gibt es kein Rückwärtsziehen.

Loslassen, Feld-/Fensterfokusverlust, ausgeblendetes Dokument, Shift, T, Z, R und Raumwahl löschen die E-Bereitschaft. Der E-Button erklärt die Magnet-/Kraftsteuerung und bedient Batterieanschlüsse; er rastet nicht ein. Undo nimmt auch Schieben, Modultausch und Verbindungen gemeinsam zurück.

**Feste Körper, freie Module:** Nur Pip passt durch Schächte. Bolt hält schwere Platten und schiebt; Metallkisten halten Platten ebenfalls. Beide Bots können mit Magnet ziehen und mit Batterie Sockel versorgen. Kisten passen nicht durch Schächte. Die Batterie versorgt nur den Sockel unter dem verbundenen Träger; Wegfahren, E oder T lösen die Verbindung.

Gleiche **A/B/C-Symbole** verbinden Quellen mit Toren/Brücken. **○ inaktiv / ● aktiv** bleiben sichtbar; offene Tore verlieren ihre Sperrstreben, Platten sinken ein, Sockel und Brücken zeigen ihren Zustand. Aktivierte Quelle und zugehörige Tore leuchten kurz gemeinsam auf. Dezente Leitungen liegen unter allen Objekten. Das `PIP`-Label gehört direkt zum jeweiligen Schachtfeld, auch beim horizontalen Partnerweg.

Tore rasten nicht ein. Ein Bot auf einem schließenden Tor darf es verlassen; das hält es nicht für seinen Partner offen. Eine besetzte Brückenspanne bleibt bei Stromausfall sicher ausgefahren, bis alle Bots/Kisten sie verlassen haben. Keine Stürze oder zerstörbare Objekte.

Fahrten interpolieren 160 ms. Folgeaktionen beenden die vorige Darstellung am gültigen Zielfeld; es gibt keine versteckte Eingabeschlange. **Reduced motion** deaktiviert Fahrinterpolation und sämtliche Aktions-/Aktivierungsimpulse, auch bei geänderter Systemeinstellung. Feste Zustandsanzeigen bleiben erhalten. **Ton startet aus** und kann nach Browserinteraktion eingeschaltet werden.

## Sechs kleine Schritte

| Raum | Lernschritt |
| --- | --- |
| 1 · Klein & schwer | Pip durch den Schacht, Bolt auf der Platte; Shift |
| 2 · Energie teilen | Magnetziehen, benachbartes T, Batterie an Pip |
| 3 · Technikraum | Proberaum: erst Strom von Pip, dann Bolts Plattenhilfe; beide hinaus |
| 4 · Schwere Fracht | Bolt schiebt Fracht in eine Nische; sie löst den Versorger ab |
| 5 · Getrennte Wege | Zwei Schaltkreise; Fracht vor dem letzten Tor ersetzt den Wachposten |
| 6 · Brückendienst | Pip hilft Bolt über die Brücke, Bolt öffnet Pips Partnerweg, Pip hilft Bolt durch Tor B |

Alle Räume sind direkt anwählbar; Raumwahl leert Undo. Raum 1 verlangt Pip am Ausgang und Bolt auf der Platte, Raum 2 Bolt am Ausgang und aktive Versorgung. Räume 3–6 verlangen beide Bots auf den beiden Ausgangsfeldern. Es gibt keine Tauschzähler-Siegpflicht. **Alle sechs Lösungen, Koordinaten, Gegenversuche und offene Prüfungen:** [Kooperationspaket](docs/2026-11-02-kooperation.md).

## Nachvollziehbarer Code

- `src/game/rules.ts`: Reine TypeScript-Zustände und Übergänge ohne DOM/Phaser/Timer. Raumdaten, Schaltkreise, Körpergrenzen, Ziehen/Schieben, Strom, Undo. Die bestehende Aktion `pull` bedeutet intern E+Richtung: rückwärts Magnetziehen, bei Bolt vorwärts Kraftschieben. Keine zusätzliche Eingabe- oder Zustandsmaschine.
- `src/main.ts`: Eine Phaser-Scene, gemeinsame Modulformen für beide Bots, Nase/Gesichter, Eingaben und HTML-Anzeige. Reihenfolge: Boden, Leitungen, Einrichtungen, Fracht/Bots; Zustandsbadges bleiben darüber lesbar. Bereitschaft und Effekte sind vorübergehende Darstellung.
- `index.html` / `src/style.css`: Bedienung und vorhandenes Layout; keine zusätzlichen Abhängigkeiten.
- `tests/`: Aktualisierte Lösungen für alle sechs Räume, Regelregressionen für Körper-/Modulrollen und acht Browserprüfungen mit echter Tastaturbedienung; keine Debug-Zustandssetter.
- `deploy/`: Bestehende Releasewerkzeuge, SHA-256-Manifeste und Releasebelege; nur die drei Builddateien werden öffentlich ausgeliefert.

Layoutzeichen: `#` Wand, `.` Boden, `v` Schacht, `S` Sockel, `D` Tor, `P` schwere Platte, `X` Ausgang, `O` feste Keramik, `~` Grube, `B` Brücke. Bots und optionale Fracht starten an separat definierten Positionen.

Grenzen: Kein vollständiger Zustandsraumbeweis, keine unabhängige Spielabnahme. Sichtdurchgänge in lokalem Headless Chromium ersetzen keinen menschlichen Spieltest. Firefox, Safari, itch.io-Einbettung, physischer Fokuswechsel und Hörabnahme bleiben offen. Keine Speicherung, Gegner oder Touch-Steuerung; Canvas ist noch nicht vollständig für Screenreader zugänglich. Die bekannte Vite-Warnung zur Phaser-Bundlegröße bleibt.

MIT-Lizenz, Copyright (c) 2026 Chris; siehe [LICENSE](LICENSE). Abhängigkeiten behalten ihre Lizenzen.
