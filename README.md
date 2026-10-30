# BerichtKit (Spektron)

Erstellt den **Asbest-Untersuchungsbericht** („1. Mitteilung“) als Word-Datei im Format des Büros – aus den Daten, die
die anderen Spektron-Apps schon im Projektordner abgelegt haben. Läuft im Browser (Edge/Chrome), ohne Server, ohne Installation.

Adresse: `https://kaspersebastian83-dot.github.io/berichtkit/` · aus der Projektzentrale: `…/berichtkit/#projekt=<Ordnername>`

## Was woher kommt

| Im Bericht | Quelle | Datei |
|---|---|---|
| Deckblatt (VN/Auftraggeber, Risiko/Schadenort, Versicherer, Schaden-Nr.), Auftragsdatum | Projektzentrale | `_Projekt.json` – „mit Versicherung“, wenn `versicherer` eingetragen ist oder (bei eingetragenem VN) der Auftraggeber eine Versicherung ist, sonst „ohne“; im Bericht unter „Auftrag“ umstellbar. Versicherer: `versicherer`, sonst der Auftraggeber (als „angenommen“ angezeigt, mit „✓ stimmt“ bestätigt – `versOk` gilt nur für diesen Auftraggeber) |
| Proben: Entnahmestelle, Material (`z3`, leer → aus der Matrix), Probenahmedatum; Probenehmer (Feldbogen, nur genauer Name) | LabelKit (Asbest-Tabelle) | `*_Daten.json` – die Datei, die ResultKit übernommen hat (`auftrag.quelle`), sonst die neueste |
| Ergebnis, Labor-Nr., Prüfbericht-Nr., KI-Wert (falls im XML) | ResultKit | `_Ergebnisse.json` |
| Fotos zu den Proben (Probe-Nr. in FotoKit) | FotoKit | `_Bildumbenenner.json` + `Fotos/` |
| Anlagen (Bilddokumentation, Probenplan, optional Ergebniskarte/Raumbuch/Wandansichten/Anlage Probenahme) | FotoKit, PlanKit | `Fotos/Bilddokumentation_*.pdf`, `Pläne/Probenplan *.pdf`, `Mitteilungen/*_Raumbuch_*.docx` … – siehe „Anlagen“ |
| Namen | Projektzentrale | `<Archiv>/_Spektron-Mitarbeiter.json` |
| Rollen, Frau/Herr (ohne Eintrag: Büro-Standard nach Nachname), Labor | BerichtKit „Einstellungen“ | `<Archiv>/_Spektron-BerichtKit.json` – die Rolle („als Sachverständige(r)“/„als Messtechniker(in)“) ist je Unterschrift vorgewählt und im Bericht änderbar. Ab 1.8.0 wird auch `rolle: 'sv'` gespeichert; ohne `rolle` gilt die Person als SV, die Rolle aber als „nicht festgelegt“ (Hinweis, wenn sie selbst Proben genommen hat) |
| Unterschriften | von Hand abgelegt | `<Archiv>/_Spektron-Unterschriften/<Kürzel>.png` |
| Angaben zum Bericht (Variante, Daten, Personen, Auswahl der Proben und Fotos) | BerichtKit, gemeinsam für alle | `_Spektron/BerichtKit/_BerichtKit.json` (Vor Spektron: `Mitteilungen/`) |

Die Ablageorte im Projekt bestimmt das gemeinsame Modul `spektron-ordner.js` (Bereich `berichtkit`; byte-gleich mit der Projektzentrale, in CI geprüft).

## In der Suite

- **Projektzentrale:** Knopf „Asbestbericht“ in Stufe 4 (Gutachten) öffnet BerichtKit mit dem Projekt (`#projekt=<Ordnername>`).
- **Spektron-Leiste** oben (`mosaik-leiste.js`, Block byte-gleich mit LabelKit, FotoKit, ResultKit, PlanKit, BelegKit): BerichtKit ist der Schritt nach PlanKit; Haken, sobald ein Bericht `<n>._Mitteilung_<Nr>.docx` in „Mitteilungen“ liegt.
- **Gemeinsame Angaben:** Was im Formular selbst geändert wird, liegt in `_BerichtKit.json` im Projekt und gilt für alle Kollegen. Hat jemand inzwischen gespeichert, lädt BerichtKit dessen Stand und meldet es – nichts wird stumm überschrieben. Dazu die Liste der gespeicherten Berichte (Datei, Zeit, Kürzel aus „Ich bin …“, Mitteilung-Nr., Berichtsdatum).
- **Vorgaben werden nicht eingefroren** (`bericht-vorgaben.js`): Heutiges Datum, nächste freie Mitteilung, Auftragsdatum und Auftraggeber
  (Projektzentrale), Probenehmer (LabelKit), Labor (Einstellungen) werden bei jedem Öffnen neu berechnet; in der Datei stehen nur selbst
  geänderte Felder (`nurEigene: true`). Gibt es die gespeicherte Mitteilung-Nr. schon in „Mitteilungen“, wird die nächste freie vorgeschlagen
  (außer die Nummer wurde bewusst zurückgestellt – `mitteilungAm` – und seitdem kein Bericht mit ihr gespeichert);
  ein Datum, das zu einer schon gespeicherten Mitteilung gehört, weicht dem heutigen – beides mit Hinweis. Ältere Dateien (bis 1.6.1, ganzes
  Formular) werden beim Öffnen bereinigt: leere Werte, Werte gleich der heutigen Vorgabe und ein Datum vor heute fallen weg, alles andere bleibt
  (Hinweis nennt die Felder, die von den Projektdaten abweichen).
- **Daten neu lesen:** `_Projekt.json`, die LabelKit-Datei und `_Ergebnisse.json` werden beim Zurückkommen ins Fenster (z. B. nach „Übernehmen“
  in ResultKit) und vor dem Speichern/Herunterladen verglichen (Name, Größe, Änderungszeit) und bei Änderung neu gelesen – mit bleibendem Hinweis
  „Daten neu gelesen: …“. Vor dem Speichern hält BerichtKit dann an: erst die neue Vorschau ansehen, dann noch einmal klicken.
- **Offline:** Service Worker „Netz zuerst“ wie in der Projektzentrale (`sw.js`).
- **Handbuch:** Knopf „📘 Handbuch“ öffnet AidKit, Kapitel `#app-berichtkit` („BerichtKit Schritt für Schritt“).

## Regeln

- **Nur lesen** – BerichtKit ändert keine Projektdatei der anderen Apps (Anlagen werden nur gefunden, nie verschoben oder umbenannt). Es schreibt nur die Word-Datei nach `Mitteilungen/`
  (vorhandene Datei: Dialog „Ersetzen“ / „Daneben als (2) speichern“ / „Abbrechen“ – Abbrechen ist der Standard; nennt eine Büroaufgabe die Datei
  schon, gibt es statt „Ersetzen“ nur „Als nächste Mitteilung speichern“), seine eigenen Angaben (`_BerichtKit.json`) und die Einstellungen in den Archivordner.
  Die Büroaufgaben (`_Spektron/Buero`, bzw. `_Buero`) werden dafür nur gelesen.
- **Laborwerte und Probenbezeichnungen werden nie bearbeitet.** Ergebnistexte kommen wörtlich aus dem Prüfbericht (über ResultKit).
  Einzige Ausnahme: ein KI-Wert, der nicht in den Labordaten steht, kann aus dem PDF eingetragen werden (im Formular markiert).
- **Nichts wird erfunden.** Fehlt eine Angabe, steht sie im Bericht als gelb markierte Lücke, z. B. `[Auftragsdatum]`.
- **Keine Namen, Unterschriften oder Kundendaten im Repository** – Namen kommen aus der Mitarbeiterliste, Unterschriften aus dem Archivordner.
  Die Testdaten sind erfunden.

## Prüfungen vor dem Speichern

- **Gesperrt** (nur „Entwurf herunterladen“ mit Kopfzeile „ENTWURF – nicht versenden“ und `_ENTWURF` im Dateinamen):
  LabelKit-Datei eines anderen Projekts; LabelKit-Asbestprobe ohne Ergebnis in ResultKit (unter „Proben“ abwählbar).
- **Hinweis:** Entnahmestelle LabelKit ↔ Prüfbericht weicht ab (Vergleich wie ResultKit `beschreibungWeichtAb`; wird nach dem
  Gegentest mit echten Projekten zur Sperre, Schalter `ABGLEICH_SPERRT` in `bericht-text.js`); vorläufiger Prüfbericht (dazu Kopfzeile
  „Vorläufig“); Versicherer, Probenehmer oder Unterschrift nur angenommen – je eine Meldung mit „✓ stimmt“ (`pnQuelle`, `versOk`, `svOk`).
  Unterschrift angenommen heißt: Der Zuständige ist Messtechniker(in) oder fehlt, vorgeschlagen ist die erste Sachverständige der Liste (`svVorschlag`).
- **Lücken** sperren nicht – Rückfrage vor dem Speichern; die Übergabe ans Büro prüft, ob noch welche in der Word-Datei stehen.
- Nach dem Speichern: `_BerichtKit.json` → `berichte[]` mit `anlagen` (alle Anlage-Dateien, z. B. `Laborergebnisse/<Prüfbericht>.pdf`, `Fotos/Bilddokumentation_….pdf`), `anlagenListe` und `luecken`; Knopf
  „Ans Büro übergeben →“ öffnet `../Projektzentrale/#projekt=<Ordner>&uebergabe=Mitteilungen/<Datei>`.

## Anlagen

`anlagen.js` (ohne Browserteile, `node tests/anlagen.cjs`) erkennt, was im Projektordner liegt, und nummeriert in der **festen
Hausreihenfolge**: Anlage 1 = Prüfbericht(e) (mehrere zählen hoch), dann **Bilddokumentation**, dann **Probenplan**. Das Modul kennt
nur Arten von Anlagen; welche ein Bericht erwartet, sagt das Profil (`PROFILE.asbest`) – weitere Berichtsarten bekommen ein eigenes.

| Art | Wo | Erkannt an | Veraltet, wenn … |
|---|---|---|---|
| Bilddokumentation | `Fotos/` | `Bilddokumentation_…pdf`, Teile `…_Teil_1_von_2.pdf` = **eine** Anlage; FotoKit ab 1.29 vermerkt die erzeugte PDF (`bilddoku`) | FotoKit: `dokuGeaendert` nach `bilddoku.erstellt` (Beschreibungen, Auswahl, Reihenfolge, Projektdaten geändert) |
| Probenplan | `Pläne/` | `Probenplan <Ordner>.pdf` (alle Geschosse) oder `… - EG.pdf`, `… - OG.pdf` (= eine Anlage), „ (2)“ = neuere Fassung | `.probenplan` nach dem PDF gespeichert |
| Ergebniskarte | `Pläne/` | `Probenplan … - Ergebniskarte.pdf` | wie Probenplan |
| Raumbuch, Wandansichten, Anlage Probenahme | `Mitteilungen/` | PlanKit-Namen `<Nr>_Raumbuch_<Datum>.docx` usw. | Prüfsumme der `.probenplan` laut `_Anlagen-Protokoll.txt` ≠ jetzt; sonst Dateizeit |

- Gefunden und aktuell → angehakt. **Veraltet oder unvollständig → Hinweis und nicht angehakt** (selbst anhaken geht, mit Hinweis).
  Feste Anlagen, die fehlen, stehen grau da mit Link in die App. Jede feste Anlage, die nicht oder mit Mangel im Bericht ist (fehlt,
  veraltet, unvollständig), bekommt zusätzlich einen Hinweis mit Sprung in die App – nichts fällt still heraus. Ergebniskarte, Raumbuch, Wandansichten und Anlage Probenahme
  sind optional: angeboten, nie vorgehakt, angehakt hinter dem Probenplan. „+ Weitere Datei …“ für eigene Anlagen aus dem Projektordner.
- Die eigene Wahl gilt nur für denselben Stand (`form.anlagen[art].key`): eine neu erstellte oder inzwischen veraltete Anlage wird wieder nach der Regel vorgehakt.
- Text: In „2. Probenahme und Untersuchung“ ein Satz „Die Entnahmestellen sind zusätzlich in der Bilddokumentation (Anlage 2) und im Probenplan (Anlage 3) dargestellt.“ – je nach Auswahl gekürzt.
- Trägt die Bilddokumentation eine andere Anlagen-Nr. als im Bericht (FotoKit „Anlagen-Nr.“), erscheint ein Hinweis.
- Neu gelesen beim Öffnen, wenn das Fenster wieder nach vorn kommt (z. B. aus FotoKit) und vor dem Speichern.
- Beim Speichern: `berichte[].anlagen` = Pfade **aller** Anlage-Dateien (die Übergabe in der Projektzentrale hakt sie vor), `anlagenListe` = `{ nr, art, titel, dateien }`.

## Texte

Die Textbausteine stehen in `bericht-text.js` und folgen dem Doc „Textbausteine Asbest-Untersuchungsbericht“ (Stand 30.10.2026):
Veranlassung (Probenahme durch uns / zugestellte Probe mit Gewährleistungssatz), Probenahme und Untersuchung, Befund mit Tabelle 1
(immer, auch bei einer Probe), Schlussfolgerungen (TRGS 519; KMF nach TRGS 905 Fassung 2026 und TRGS 521), Unterschriften
(Sachverständige(r) allein oder mit Messtechniker; zugestellt: nur Sachverständige(r)), Anlagenverzeichnis je Prüfbericht.
Die Formatierung (A4, Arial 12, 1,5-zeilig, Deckblatt mit Logo, Kopfzeilen, „Seite X von Y“) baut `bericht-docx.js`.

## Tests

```
node tests/text.cjs              # alle Berichtsvarianten (Textbausteine)
node tests/anlagen.cjs           # Anlagen: erkennen, Hausreihenfolge, veraltet, mehrteilig
node tests/sw.cjs                # Offline-Dateien vollständig; Leiste gleich wie LabelKit (falls ../labelkit daneben)
node tests/spektron-ordner.cjs   # gemeinsames Modul (mit ../projektzentrale byte-gleich)
node tests/browser.cjs           # im Browser: öffnen, Vorschau, Einstellungen, Word-Datei (Playwright)
node tests/render-beispiele.cjs <Ordner>   # Beispielberichte als .docx zum Ansehen (nicht in CI)
```

## Drittanbieter

- `vendor/docx.iife.js` – [docx](https://github.com/dolanmiu/docx) 9.8.1, MIT-Lizenz (`vendor/docx-LICENSE.txt`)
- `fonts.css` – IBM Plex Sans/Mono, SIL Open Font License 1.1

## Versionen

Version und Änderungen stehen in `app.js` (`APP_VERSION`, `CHANGELOG`) und erscheinen oben rechts in der App.
