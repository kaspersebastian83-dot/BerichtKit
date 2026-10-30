/* BerichtKit – eigene Angaben und berechnete Vorgaben (ohne Browserteile, in Node testbar).

   Das Formular ist immer: Vorgaben (bei jedem Öffnen neu berechnet – heutiges Datum, nächste freie Mitteilung,
   Auftragsdatum und Auftraggeber aus der Projektzentrale, Probenehmer aus LabelKit, Labor aus den Einstellungen …)
   + eigene Angaben (was jemand im Formular selbst geändert hat). In `_BerichtKit.json` stehen nur die eigenen Angaben
   (Kennzeichen `nurEigene: true`). Bis 1.6.1 stand dort das ganze Formular – samt Vorgaben vom Tag der ersten Bearbeitung.

   formBereinigen – beim Öffnen und für Dateien ohne Kennzeichen:
   1. Mitteilung Nr. n gibt es schon (n < nächste freie) → die Nummer fällt weg, vorgeschlagen ist die nächste freie.
   2. Berichtsdatum fällt weg, wenn es zu einer schon gespeicherten Mitteilung mit anderer Nummer gehört (berichte[]),
      bei einer Datei ohne Kennzeichen auch, wenn es vor heute liegt (eingefroren beim ersten Bearbeiten).
   3. Datei ohne Kennzeichen: leere Werte und Werte gleich der heutigen Vorgabe sind keine eigenen Angaben (fallen weg);
      alles andere bleibt als eigene Angabe – lieber eine Angabe zu viel behalten als eine echte Eingabe verlieren. */
(function (root) {
'use strict';

/** Nummer einer Mitteilung aus dem Dateinamen: „2._Mitteilung_26.0512.docx“, „1. Mitteilung ….docx“, „1__Mitteilung.docx“ → 2, 1, 1 */
function mitteilungNr(name) {
  const m = /^(\d+)[._\s]*Mitteilung(?![a-zäöüß])/i.exec(String(name == null ? '' : name).normalize('NFC'));
  return m ? +m[1] : 0;
}
/** Nächste freie Mitteilung zu den Dateinamen in „Mitteilungen“ */
function naechsteNr(namen) { return (namen || []).reduce((max, n) => Math.max(max, mitteilungNr(n)), 0) + 1; }

/** JSON mit sortierten Schlüsseln – Vergleich unabhängig von der Reihenfolge der Felder */
function stabil(v) {
  return JSON.stringify(v === undefined ? null : v, (k, x) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.keys(x).sort().reduce((o, s) => { o[s] = x[s]; return o; }, {}) : x);
}
const gleich = (a, b) => stabil(a) === stabil(b);
const leer = v => v == null || v === '' || (Array.isArray(v) ? !v.length : typeof v === 'object' && !Object.keys(v).length);
const datumDE = v => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? `${m[3]}.${m[2]}.${m[1]}` : String(v || ''); };

/** ctx: { vorgabe, naechste, heute ('JJJJ-MM-TT'), alt (Datei ohne Kennzeichen), berichte[] }
    → { form (nur eigene Angaben), entfernt: [Feld], hinweise: [Text] } */
function formBereinigen(form, ctx) {
  const c = ctx || {}, vorgabe = c.vorgabe || {}, naechste = +c.naechste || 1, heute = String(c.heute || '');
  const out = JSON.parse(JSON.stringify(form && typeof form === 'object' ? form : {})), entfernt = [], hinweise = [];
  const weg = k => { delete out[k]; entfernt.push(k); };
  // 1. Nummer schon vergeben
  if (out.mitteilung != null && out.mitteilung !== '') {
    const n = +out.mitteilung;
    if (!(n >= 1) || n < naechste) {
      weg('mitteilung');
      if (n >= 1) hinweise.push(`Die ${n}. Mitteilung gibt es schon in „Mitteilungen“ – vorgeschlagen ist jetzt die ${naechste}. Mitteilung. Willst du die ${n}. ersetzen, stell die Nummer wieder auf ${n}.`);
    }
  }
  const nr = out.mitteilung != null ? +out.mitteilung : naechste;
  // 2. Datum gehört zu einer gespeicherten Mitteilung oder ist (alte Datei) beim ersten Bearbeiten stehen geblieben
  if (out.datum) {
    const zu = (c.berichte || []).filter(b => b && b.datum === out.datum && +b.mitteilung >= 1 && +b.mitteilung !== nr).pop();
    if (zu) { hinweise.push(`Das Berichtsdatum ${datumDE(out.datum)} gehörte zur ${+zu.mitteilung}. Mitteilung – jetzt steht das heutige Datum da.`); weg('datum'); }
    else if (c.alt && heute && out.datum < heute) {
      hinweise.push(`Das Berichtsdatum war seit dem ersten Bearbeiten auf dem ${datumDE(out.datum)} stehen geblieben – jetzt steht das heutige Datum da. Brauchst du ein anderes, trag es ein.`);
      weg('datum');
    }
  }
  // 3. Alte Datei: Vorgaben und leere Werte sind keine eigenen Angaben
  if (c.alt) for (const k of Object.keys(out)) if (leer(out[k]) || (k in vorgabe && gleich(out[k], vorgabe[k]))) weg(k);
  return { form: out, entfernt, hinweise };
}

/** Ist die Datei schon beim Büro? Ja, wenn eine nicht zurückgezogene Büroaufgabe (Gutachten) genau diese Datei nennt
    (wie stufen.js in der Projektzentrale; Vergleich nur über den Dateinamen, ohne Groß-/Kleinschreibung).
    aufgaben: [{ id, art, word, erstellt }], vermerke: [{ id, aufgabe, schritt, wert, zeit }] (BUEROKIT-AUFGABEN v1) → Aufgabe oder null */
function beimBuero(aufgaben, vermerke, datei) {
  const name = v => String(v == null ? '' : v).split(/[\\/]/).pop().normalize('NFC').toLowerCase();
  const ziel = name(datei); if (!ziel) return null;
  const zurueckgezogen = id => {
    const v = (vermerke || []).filter(x => x && x.aufgabe === id && x.schritt === 'geloescht')
      .sort((a, b) => String(a.zeit).localeCompare(String(b.zeit)) || String(a.id).localeCompare(String(b.id))).pop();
    return !!(v && v.wert !== false);
  };
  return (aufgaben || []).filter(a => a && a.art === 'gutachten' && name(a.word) === ziel && !zurueckgezogen(a.id))
    .sort((a, b) => String(a.erstellt).localeCompare(String(b.erstellt)))[0] || null;
}

const API = { VERSION: 1, mitteilungNr, naechsteNr, formBereinigen, beimBuero, stabil, gleich };
if (typeof module === 'object' && module.exports) module.exports = API;
root.BerichtVorgaben = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
