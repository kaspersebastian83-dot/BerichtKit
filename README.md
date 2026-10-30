# BerichtKit (Spektron)

Erstellt den **Asbest-Untersuchungsbericht** („1. Mitteilung“) als Word-Datei im Format des Büros – aus den Daten, die
die anderen Spektron-Apps schon im Projektordner abgelegt haben. Läuft im Browser (Edge/Chrome), ohne Server, ohne Installation.

Adresse: `https://kaspersebastian83-dot.github.io/berichtkit/` · aus der Projektzentrale: `…/berichtkit/#projekt=<Ordnername>`

## Was woher kommt

| Im Bericht | Quelle | Datei |
|---|---|---|
| Deckblatt (VN/Auftraggeber, Risiko/Schadenort, Versicherer, Schaden-Nr.), Auftragsdatum | Projektzentrale | `_Projekt.json` |
| Proben: Entnahmestelle, Material, Probenahmedatum | LabelKit (Asbest-Tabelle) | `*_Daten.json` (neueste) |
| Ergebnis, Labor-Nr., Prüfbericht-Nr., KI-Wert (falls im XML) | ResultKit | `_Ergebnisse.json` |
| Fotos zu den Proben (Probe-Nr. in FotoKit) | FotoKit | `_Bildumbenenner.json` + `Fotos/` |
| Namen | Projektzentrale | `<Archiv>/_Spektron-Mitarbeiter.json` |
| Rollen, Frau/Herr, Labor | BerichtKit „Einstellungen“ | `<Archiv>/_Spektron-BerichtKit.json` |
| Unterschriften | von Hand abgelegt | `<Archiv>/_Spektron-Unterschriften/<Kürzel>.png` |

Die Ablageorte im Projekt bestimmt das gemeinsame Modul `spektron-ordner.js` (byte-gleich mit der Projektzentrale, in CI geprüft).

## Regeln

- **Nur lesen** – BerichtKit ändert keine Projektdatei der anderen Apps. Es schreibt nur die Word-Datei nach `Mitteilungen/`
  (vorhandene Datei: Rückfrage, sonst „… (2).docx“) und die Einstellungen in den Archivordner.
- **Laborwerte und Probenbezeichnungen werden nie bearbeitet.** Ergebnistexte kommen wörtlich aus dem Prüfbericht (über ResultKit).
  Einzige Ausnahme: ein KI-Wert, der nicht in den Labordaten steht, kann aus dem PDF eingetragen werden (im Formular markiert).
- **Nichts wird erfunden.** Fehlt eine Angabe, steht sie im Bericht als gelb markierte Lücke, z. B. `[Auftragsdatum]`.
- **Keine Namen, Unterschriften oder Kundendaten im Repository** – Namen kommen aus der Mitarbeiterliste, Unterschriften aus dem Archivordner.
  Die Testdaten sind erfunden.

## Texte

Die Textbausteine stehen in `bericht-text.js` und folgen dem Doc „Textbausteine Asbest-Untersuchungsbericht“ (Stand 30.10.2026):
Veranlassung (Probenahme durch uns / zugestellte Probe mit Gewährleistungssatz), Probenahme und Untersuchung, Befund mit Tabelle 1
(immer, auch bei einer Probe), Schlussfolgerungen (TRGS 519; KMF nach TRGS 905 Fassung 2026 und TRGS 521), Unterschriften
(Sachverständige(r) allein oder mit Messtechniker; zugestellt: nur Sachverständige(r)), Anlagenverzeichnis je Prüfbericht.
Die Formatierung (A4, Arial 12, 1,5-zeilig, Deckblatt mit Logo, Kopfzeilen, „Seite X von Y“) baut `bericht-docx.js`.

## Tests

```
node tests/text.cjs              # alle Berichtsvarianten (Textbausteine)
node tests/spektron-ordner.cjs   # gemeinsames Modul (mit ../projektzentrale byte-gleich)
node tests/browser.cjs           # im Browser: öffnen, Vorschau, Einstellungen, Word-Datei (Playwright)
node tests/render-beispiele.cjs <Ordner>   # Beispielberichte als .docx zum Ansehen (nicht in CI)
```

## Drittanbieter

- `vendor/docx.iife.js` – [docx](https://github.com/dolanmiu/docx) 9.8.1, MIT-Lizenz (`vendor/docx-LICENSE.txt`)
- `fonts.css` – IBM Plex Sans/Mono, SIL Open Font License 1.1

## Versionen

Version und Änderungen stehen in `app.js` (`APP_VERSION`, `CHANGELOG`) und erscheinen oben rechts in der App.
