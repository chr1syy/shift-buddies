# Shift Buddies

Shift Buddies ist Chris’ Solo-Projekt für den **Game Off 2026** zum Motto **Shift**: ein kleines Rätselspiel mit zwei Robotern, die nur gemeinsam weiterkommen.

## Spielkonzept

- **Pip** ist klein und passt durch enge Wartungsschächte.
- **Bolt** ist schwer und aktiviert schwere Druckplatten.
- Beide Roboter tragen tauschbare **Magnet- und Strommodule**. Das Magnetmodul bewegt passende Metallobjekte; das Strommodul versorgt passende Anschlüsse mit Energie.
- **Shift** wechselt den gesteuerten Roboter. Stehen Pip und Bolt nebeneinander, können sie ihre Module tauschen.

Die Rätsel verbinden die unterschiedlichen Körper der Roboter mit den Fähigkeiten ihrer Module: Wer kommt wohin, und wer braucht gerade welches Modul?

## Technik und Zielplattform

- **TypeScript + Phaser**
- **PC-Browser** mit Tastatursteuerung
- Geplante Veröffentlichung auf **itch.io**

Chris kennt TypeScript und sammelt mit diesem Projekt erste Erfahrungen in der Spieleentwicklung. Die Entwicklung erfolgt in kleinen, nachvollziehbaren Schritten; Mira koordiniert.

## Erstes Rätsel: der Technikraum

Pip und Bolt sollen gemeinsam den Ausgang eines Technikraums erreichen. Als erster Entwurf sind diese Elemente vorgesehen:

- Ein Wartungsschacht führt zu einem Stromanschluss, den nur Pip erreichen kann.
- Eine schwere Druckplatte kann nur Bolt aktivieren und öffnet einen Durchgang.
- Ein bewegliches Metallteil lässt sich mit dem Magnetmodul verschieben, um einen Weg freizumachen.
- Ein gemeinsamer Bereich bietet Platz zum Modultausch. Beide Roboter müssen die passenden Module an die richtigen Stellen bringen.

Die genaue Anordnung und Reihenfolge werden beim Bau des ersten Raums erprobt.

## Stand und nächster Meilenstein

Dieses Repository enthält zunächst nur die Projektgrundlage. Es gibt noch keine Spielimplementierung, Abhängigkeiten oder Build-Konfiguration.

Der nächste Meilenstein ist **ein spielbarer Raum**: Pip und Bolt bewegen, mit Shift wechseln, nebeneinander Module tauschen und gemeinsam das erste Technikraum-Rätsel lösen.

Veröffentlichungen und Deploys erfolgen nur nach ausdrücklichem Auftrag von Chris.

## Lizenz

MIT-Lizenz, Copyright (c) 2026 Chris. Siehe [LICENSE](LICENSE).
