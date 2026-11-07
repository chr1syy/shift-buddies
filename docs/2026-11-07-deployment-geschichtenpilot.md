# Öffentliche Vorschau: Modulübergabe und Geschichtenpilot · 07.11.2026

**Live und automatisiert geprüft:** https://shift-buddies.clippmann.de/ zeigt Modulübergabe UND Geschichtenpilot in Raum 04. Chris hat diese Veröffentlichung einschließlich normalem Git-Push, atomarem Releasewechsel und sanftem NGINX-Reload ausdrücklich autorisiert. Menschlicher Spieltest bleibt offen; keine itch.io-Veröffentlichung.

## Exakter Stand

- Spiel-/Prüf-SHA: `0ffc8e03c3f0096a43fa820a41c51674d1036e82` auf `main`; enthält `df68aca34310445668c39f3f5d9b8fad4acb5d4d` und den Geschichtenpilot. Normal zu Origin gepusht. Der folgende Berichtcommit enthält nur Dokumentation, Manifest und Receipt; keine Änderung an Spiel, Test, Build oder Abhängigkeiten.
- Release: `/var/www/shift-buddies/releases/20261107T152749Z-0ffc8e03c3f0`.
- Aktiver Link: `/var/www/shift-buddies/current` → `releases/20261107T152749Z-0ffc8e03c3f0`.
- Vorgänger `releases/20261103T115853Z-d535f02edccc` vollständig erhalten und erneut gegen sein Manifest geprüft.
- [Exakte Buildhashes](../deploy/release-2026-11-07-geschichtenpilot.sha256) · [Receipt mit Rohbeleghashes](../deploy/receipt-2026-11-07-geschichtenpilot.json).

Sauberer Checkout und Origin wurden vorab geprüft; nur dieser Ursprungstab war beim vorhandenen Owner aktiv, alle weiteren Owner-Tabs idle. Keine zweite registrierte Arbeitskopie und kein weiterer erkennbarer Bearbeiter im Repository. Kein Worktree, AutoRun oder zusätzlicher Agent. Spiel-/Test-/Builddateien sind nach der Abnahme per SHA-256 unverändert.

## Tatsächliche Prüfungen

Frisch auf diesem Quell-SHA: **32/32 Regel-/Inputtests**, Typecheck und Produktionsbuild bestanden. **19/19 Chromium-Fälle lokal gegen den stabilen Produktionsbuild** auf Loopback (3,8 Minuten), danach **19/19 über normales öffentliches HTTPS**. Keine TLS-/DNS-Umleitung, kein Zertifikatsbypass und keine abgeschwächten Erwartungen. Der erste öffentliche Gesamtlauf hatte 18/19 bestandene Fälle; Details und unveränderte Wiederholungen unten. Alle sechs Tastaturlösungen, vollständiges Undo und erneutes Lösen bei Reduced motion sind enthalten. Die globale Browserprüfung meldete keine Konsolen-/Laufzeitfehler.

Übergabe: Beide real gezeichneten Module verlassen ihre Träger, kreuzen auf getrennten Bögen und docken korrekt an; Besitz und Undo wirken unmittelbar. Undo, Neustart, Shift, erneuter Tausch, Bewegung, Interaktion, Raum-/Fokuswechsel und Reduced motion sind geprüft. Story: Werkstattauftrag ohne Lösungsvorgabe, Pip erst bei tatsächlichem Strom, Bolt erst bei tatsächlich übernehmender Fracht, gemeinsamer Abschluss mit Lampe und echten Antennen-/Nickframes, stimmige Rücknahme und kein erneutes Gestenfeuer nach Undo. Reduced motion bleibt über ganze Canvasframes statisch.

Mehrframewerte bedeuten **Frames / unterschiedliche Canvas-Pixelzustände**, keine nachgezeichneten Belege:

| Messung | Lokal | Öffentlich |
| --- | --- | --- |
| continuous-canvas-frames.json | 48 / 46 | 48 / 46 |
| turn-canvas-frames.json | 19 / 12 | 19 / 13 |
| reduced-motion-frames.json | 30 / 1 | 18 / 1 |
| abschluss-frames.json | 84 / 60 | 47 / 31 |
| magnet-canvas-frames.json | 57 / 30 | 47 / 28 |
| push-canvas-frames.json | 37 / 29 | 33 / 27 |
| handoff-canvas-frames.json | 36 / 21 | 27 / 14 |

Öffentliche Grenzgeschwindigkeiten: 0.283120 / 0.263382 px/ms bei unverändertem zulässigem Bereich 0,20–0,35. Der [historische Timingausreißer unter Hostlast](2026-11-04-geschichtenpilot.md#zeitgrenzen-und-offene-abnahme) bleibt als Grenze dokumentiert; die beobachtete Last beweist seine Ursache nicht.

Der lokale Gesamtlauf bestand im ersten Versuch. Der erste öffentliche Lauf bestand 18/19 (5,3 Minuten): 0,385752 / 0,287264 px/ms an den beiden Grenzen, bei maximal 86,4 ms zwischen Frames. Die erste obere Grenze überschritt 0,35. Hohe beobachtete Hostlast (14,31 bei vier CPUs) beweist die Ursache nicht. `public-browser-first.log`, `public-first-results/` und `public-first-timing.json` erhalten den Fehllauf. Das erste Resultverzeichnis wurde unverändert nach `public-first-results/` verschoben; im Originalprotokoll genannte `public-results/`-Pfade sind für diesen ersten Lauf entsprechend umzusetzen.

Drei unveränderte öffentliche Einzelwiederholungen bestanden anschließend 2/3 (0,368296 px/ms im fehlgeschlagenen Lauf; sämtliche Messwerte im Receipt); der zweite öffentliche Gesamtlauf hatte 18/19 (5,9 Minuten): Die Geschwindigkeitsprüfung bestand, aber die Prüfung auf das flüchtige `data-animating=true` nach einem korrekten Feldzug verpasste das Animationsfenster (`false` beim Lesen). Ihr Zustand war bereits am erwarteten Feld.

Drei unveränderte Einzelwiederholungen dieses Ziehfalls bestanden danach 3/3 (25,7 Sekunden). Der dritte vollständige öffentliche Lauf bestand 19/19. Beide vorherigen Fehlläufe und alle Wiederholungen bleiben im Receipt enthalten; `public-second-results/` bewahrt die zweite vollständige Rohaufnahme, deren Originalprotokoll ebenfalls `public-results/` nennt. Spielcode, Testcode und Grenzen blieben bytegleich. Kein FPS- oder Timingversprechen für beliebige Hostlast.

Öffentlicher Screenshot aus dem echten Storytest: `.cache/deploy-story-2026-11-07/public-results/browser-freight-story-visi-2bd07-y-without-celebration-flood/abschluss.png`. Er und die Frame-PNGs/JSONs bleiben lokal; ihre Hashes stehen im Receipt. Die Featuretexte und Übergabesignale sind im gebauten JS nachgewiesen. Der öffentliche JS-Body hat exakt denselben SHA-256 wie dieses Bundle; öffentliche Interaktionstests prüfen beide Features zusätzlich tatsächlich.

## Veröffentlichung und Isolation

Bestehender Atlas-Weg mit `deploy/render-nginx.py`, `deploy/check-public.py` und den angepassten vorhandenen lokalen Release-Skripten unter `.cache/deploy-story-2026-11-07/`. Nur drei öffentliche Dateien: `index.html`, `assets/index-Bb4QzEkq.js`, `assets/index-WfR_mLSn.css`. Remote Anzahl, Symlinkfreiheit, Dateirechte und exakte Hashes geprüft. Keine Sourcemaps oder neuen Rohbelege veröffentlicht.

Eigener VHost: `/etc/nginx/sites-available/shift-buddies.clippmann.de.conf`; nur `/`, `/index.html` und beide exakten Assetpfade freigegeben. Rootgeschütztes Backup (0700): `/var/backups/shift-buddies-20261107T152749Z-0ffc8e03c3f0/`, mit `previous-vhost.conf`, `previous-current.txt`, `new-vhost.conf` und `manifest.sha256`. Der Vorgänger bleibt außerhalb des aktiven Links erhalten. Aktivierung mit exklusiver eigener Deploysperre, Prüfung des erwarteten alten Links/VHosthashes, `nginx -t`, atomarem `mv -Tf` des Links und genau einem erfolgreichen `systemctl reload nginx`. Fehlerpfad stellt das alte Paar gemeinsam wieder her. NGINX-Master-PID `633529` blieb gleich; kein Serverrestart.

22 Standard-HTTPS-/HTTP-/Hash-/Sperrpfadchecks bestanden, zusätzlich drei alte/interne Pfade und acht Quellen-/Beleg-/Sourcemappfade mit 404. HTML, Root und Assets bytegleich zum Build; MIME, nosniff, noindex und HTTP-301 einschließlich Query geprüft. OpenSSL bestätigt TLS 1.3, CA und Hostname. Zertifikatsfingerprint, Seriennummer und Laufzeiten vor/nach identisch. Die 22 Standardchecks wurden nach den Browserläufen erneut bestanden; auch der finale Atlas-Snapshot bleibt mit dem Aktivierungsnachherzustand identisch. Keine DNS-, Zertifikats-, Cloudflare- oder fremden Dienständerungen.

Von 52 NGINX-/Renewaldateien und Aktivierungslinks blieb alles außer dem eigenen VHost identisch. Alle **13 Nachbar-URLs** hatten vor/nach denselben Status und Bodyhash. Die drei HTTP-522-Antworten von `clippmann.de/`, `www.clippmann.de/` und `clippmann.de/preview` bestanden schon vorher. Auch die NGINX-Warnungen zu Protokolloptionen in fremden Control-/Raidpresence-VHosts waren vorbestehend. Keine eigene Regression oder Behebung daraus abgeleitet.

**Sichtbarkeitsgrenze:** Das bestehende GitHub-Repository `chr1syy/shift-buddies` ist bereits öffentlich. Der ausdrücklich beauftragte normale Push macht Quellen dort sichtbar; die Repository-Sichtbarkeit wurde nicht verändert. Die Beschränkung auf Builddateien gilt für den Vorschauhost. Neue lokale Rohbelege werden weder zu Git hinzugefügt noch auf den Webhost übertragen. Die Forderung nach generell privaten Quellen ist mit dem vorhandenen öffentlichen Origin nicht erfüllt.

## Rückfallpaar und Belege

Rückfall vorbereitet und syntaktisch geprüft, **nicht live geprobt oder ausgeführt**. Beide Releases, VHostkopien und Manifeste sind vorhanden und hashgeprüft. VHost und Link müssen zusammen zurück:

1. Vor weiterem Rückfall aktuellen eigenen Zustand sichern und konkurrierendes Deployment ausschließen. Das vorbereitete `.cache/deploy-story-2026-11-07/rollback.sh` prüft exakt den jetzt aktiven neuen Link und passenden VHost.
2. `/var/backups/shift-buddies-20261107T152749Z-0ffc8e03c3f0/previous-vhost.conf` als eigenen VHost wiederherstellen; `nginx -t`.
3. Link atomar auf `releases/20261103T115853Z-d535f02edccc` zurücksetzen, danach ausschließlich `systemctl reload nginx`. Bei Fehler stellt das vorbereitete Skript das neue Paar gemeinsam wieder her. Keine Releases löschen.
4. Öffentliche Vorgängerbytes gegen `/var/backups/shift-buddies-20261103T115853Z-d535f02edccc/manifest.sha256` prüfen und Nachbar-/Browserprüfungen passend wiederholen. Ein späterer Rückfall benötigt einen eigenen Auftrag.

Rohbelege: `.cache/deploy-story-2026-11-07/`; insbesondere `rules.log`, `typecheck.log`, `build.log`, `local-browser.log`, `public-browser.log`, `local-results/`, `public-results/`, `http-checks.json`, `private-paths.json`, `extra-paths.json`, `bundle-presence.json`, `activation.log`, `remote-final.log`, `tls.log`, `atlas.before.json`, `atlas.after.json`, `neighbors.before.json`, `neighbors.after.json`, `isolation.json` und beide Zertifikatsbelege. Receipt enthält einzelne PNG-/Frame-/Loghashes und genaue Befehle. Mira prüft eigenständig HTTP-/Assethashes und Belege und dokumentiert anschließend im Vault; diese unabhängige Prüfung ist hier nicht vorweggenommen.

Grenzen: Headless Chromium/Linux, synthetische Blur/tabhidden-/Framepause-/Media-Ereignisse; kein Firefox/Safari, itch.io oder physischer OS-Fokustest. Menschliches Fahrgefühl, Lesbarkeit, Persönlichkeit, neue Modulübergabe und Hörabnahme bleiben offen. Die vorhandene Phaser-Bundlewarnung bleibt (1.227,72 kB JS / 330,55 kB gzip). Keine zusätzlichen Features oder Änderungen an Raum-/Modul-/Siegregeln.
