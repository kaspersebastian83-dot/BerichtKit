// Erfundene Testdaten (keine Kundendaten im Repository). Aufbau wie _Projekt.json, LabelKit *_Daten.json, ResultKit _Ergebnisse.json.
const pj = (o = {}) => ({
  format: 'mosaik-projekt', version: 1, projektnummer: '99.9001', schadenort: 'Musterstadt',
  objekt: 'Musterweg 12, 12345 Musterstadt', nutzung: 'Wohnen',
  auftraggeber: 'Beispiel Versicherung AG, Versicherungsallee 1, 54321 Beispielstadt', schadennummer: 'BV-2026-0001',
  auftragsdatum: '2026-10-05', versicherungsnehmer: 'Muster Hausverwaltung GmbH, Hauptstr. 5, 12345 Musterstadt',
  zustaendig: { kuerzel: 'Tst' }, ...o,
});
const lk = (proben) => ({ version: '4.46.0', projekt: { nr: '99.9001' }, ui: {}, proben: [], chloridProben: [], sonstigeProben: [],
  asbestProben: proben.map(([nr, datum, z2, z3, matrix]) => ({ id: nr, _nr: nr, datum, z1: '99.9001', z2, z3, z4: 'fest gebunden', zustand: 'intakt', matrix, cm2: '', notiz: '' })),
  feldprotokolle: [] });
const werte = {
  chrysotil: [{ p: 'Asbestgehalt', r: '5 - 20', u: '%', nwg: '1 %' }, { p: 'Asbestart', r: 'Chrysotil', u: '', nwg: '1 %' },
    { p: 'Asbestgehalt', r: '-', u: '%', nwg: '0,1 %' }, { p: 'Asbestart', r: '-', u: '', nwg: '0,1 %' }],
  kein: [{ p: 'Asbestgehalt', r: '-', u: '%', nwg: '1 %' }, { p: 'Asbestart', r: 'Kein Asbest nachgewiesen', u: '', nwg: '0,001 %' }],
  kmf: [{ p: 'Asbestart', r: 'Kein Asbest nachgewiesen', u: '', nwg: '1 %' }, { p: 'WHO-Fasern', r: 'nachgewiesen', u: '' }, { p: 'Kanzerogenitätsindex KI', r: '26', u: '' }],
};
const erg = (proben, bericht = 'AR-999-2026-000001-01') => ({ format: 'spektron-ergebnisse', version: 1, projekt: '99.9001',
  berichte: [{ id: 'b1', bericht, labor: 'Eurofins', auftragsreferenz: '99.9001 Musterstadt', datum: '2026-10-20', sources: { xml: bericht + '.xml', pdf: bericht + '.pdf' },
    proben: proben.map(([nr, w]) => ({ label: 'P' + nr, ref: 'Probe ' + nr, labNr: '999-2026-0000' + (100 + nr), typ: 'Asbest', reportId: 'b1', werte: werte[w] })) }],
  ersetzt: [], offen: [], hinweise: [] });
/** LabelKit-Auftrag, wie ResultKit ihn in _Ergebnisse.json ablegt: [[nr, desc]] (desc = Text der Laborübergabe) */
const auftrag = (e, proben, quelle = '99.9001_16.10.2026_Daten.json') => ({ ...e, auftrag: { quelle,
  proben: proben.map(([nr, desc]) => ({ label: 'P' + nr, typ: 'Asbest', ref: 'Probe ' + nr, desc })) } });
/** Beschreibung im Prüfbericht setzen: { P1: 'Text' } */
const berichtDesc = (e, map) => { for (const b of e.berichte) for (const p of b.proben) if (p.label in map) p.desc = map[p.label]; return e; };
const mitarbeiter = [{ ordnerKuerzel: 'Tst', appKuerzel: 'TST', name: 'Dr. Tanja Test', aktiv: true },
  { ordnerKuerzel: 'Mes', appKuerzel: 'MES', name: 'Max Messer', aktiv: true },
  { ordnerKuerzel: 'Vom', appKuerzel: 'VOM', name: 'Paul vom Beispiel', aktiv: true }];
const cfg = { format: 'spektron-berichtkit', version: 1, labor: 'Eurofins Beispiel-Labor GmbH',
  personen: { Tst: { rolle: 'sv', geschlecht: 'w' }, Mes: { rolle: 'mt', geschlecht: 'm' }, Vom: { rolle: 'sv', geschlecht: 'm' } } };
module.exports = { pj, lk, erg, auftrag, berichtDesc, werte, mitarbeiter, cfg };
