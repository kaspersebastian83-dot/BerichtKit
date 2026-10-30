// Textbausteine: Varianten aus dem Doc „Textbausteine Asbest-Untersuchungsbericht“ (node tests/text.cjs)
const assert = require('node:assert/strict');
const T = require('../bericht-text.js');
const D = require('./daten/beispiel.cjs');
const alles = m => m.abschnitte.map(a => a.titel + '\n' + a.inhalt.map(x => x.t === 'p' ? T.text(x.runs) : x.t === 'fig' ? x.caption
  : x.caption + '\n' + x.zeilen.map(z => z.join(' | ')).join('\n')).join('\n')).join('\n');
const form = (o = {}) => ({ datum: '2026-10-27', mitteilung: 1, variante: 'eigen', probenehmer: 'Mes', sv: 'Tst', mt: 'Mes', ...o });
let n = 0; const fall = (name, fn) => { fn(); n++; console.log('ok –', name); };

fall('Probenahme durch uns, eine positive Probe, Versicherungsfall', () => {
  const m = T.bericht({ pj: D.pj(), lk: D.lk([[1, '2026-10-16', 'Umkleide Schwimmbad', 'Fliesenkleber', 'Bituminöse Proben / Kleber']]),
    erg: D.erg([[1, 'chrysotil']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form(), fotos: { P1: [{ datei: '01_P1_Fliesenkleber.jpg' }] } });
  const t = alles(m);
  assert.equal(m.dateiname, '1._Mitteilung_99.9001.docx');
  assert.deepEqual(m.deckblatt.felder.map(f => f[0]), ['VN:', 'Risiko:', 'Versicherer:', 'Schaden-Nr.:']);
  assert.deepEqual(m.deckblatt.felder[0][1], ['Muster Hausverwaltung GmbH', 'Hauptstr. 5', '12345 Musterstadt']);
  assert.match(t, /Am 05\.10\.2026 wurde unser Büro durch die Beispiel Versicherung AG beauftragt, im Objekt Musterweg 12, 12345 Musterstadt eine Ortsbesichtigung/);
  assert.match(t, /Am 16\.10\.2026 wurde durch Herrn Messer \(Sachverständigenbüro Dr\. Heinz Schiffers & Partner\) im Objekt eine Materialprobe entnommen\. Die Entnahmestelle ist in Tabelle 1 aufgeführt und in Abbildung 1 dokumentiert\./);
  assert.match(t, /Die Probe wurde der Eurofins Beispiel-Labor GmbH zur Untersuchung auf Asbest übergeben\. Die Ergebnisse sind im beigefügten Prüfbericht Nr\. AR-999-2026-000001-01 dokumentiert \(Anlage 1\)\./);
  assert.match(t, /Abb\. 1: Fliesenkleber, Umkleide Schwimmbad\./);
  assert.match(t, /Tabelle 1: Entnommene Probe und Ergebnis/);
  assert.match(t, /\n1 \| 999-2026-0000101 \| Umkleide Schwimmbad \| Fliesenkleber \| Chrysotil, 5 - 20 %/);
  assert.match(t, /In Probe 1 \(Material: Fliesenkleber\) wurde Asbest nachgewiesen: Chrysotil, 5 - 20 %\./);
  assert.match(t, /Bei dem Material „Fliesenkleber“ \(Probe 1\) handelt es sich um ein asbesthaltiges Material\. Bei allen Tätigkeiten, bei denen dieses Material bearbeitet, beschädigt oder entfernt wird, sind die Gefahrstoffverordnung \(GefStoffV\) und die TRGS 519/);
  assert.deepEqual(m.unterschriften.map(u => u.rolle + ' ' + u.name), ['Die Sachverständige Dr. Tanja Test', 'Der Messtechniker Max Messer']);
  assert.deepEqual(m.luecken, []);
  assert.equal(T.text(m.kopf[2]), 'VN: Muster Hausverwaltung GmbH, Hauptstr. 5, 12345 Musterstadt');
});

fall('Direkter Auftraggeber, drei Proben, alle negativ, ohne Fotos', () => {
  const m = T.bericht({ pj: D.pj({ versicherungsnehmer: '', auftraggeber: 'Muster Wohnbau eG, Am Feld 3, 12345 Musterstadt' }),
    lk: D.lk([[1, '2026-10-08', 'EG links, Wohnzimmer', 'Bodenaufbau', 'Estriche'], [2, '2026-10-08', 'EG links, Flur', 'Fliesenkleber', 'Bituminöse Proben / Kleber'], [3, '2026-10-08', 'EG links, Bad', 'Putz', 'Putze / Spachtelmassen']]),
    erg: D.erg([[1, 'kein'], [2, 'kein'], [3, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form({ probenehmer: 'Vom', sv: 'Vom', mt: '' }) });
  const t = alles(m);
  assert.deepEqual(m.deckblatt.felder.map(f => f[0]), ['Auftraggeber:', 'Schadenort:', 'Schaden-Nr.:']);
  assert.match(t, /durch Herrn vom Beispiel \(Sachverständigenbüro/);
  assert.match(t, /im Objekt drei Materialproben entnommen\. Die Entnahmestellen sind in Tabelle 1 aufgeführt\./);
  assert.match(t, /Die Proben wurden der/);
  assert.match(t, /In keiner der drei Proben wurde Asbest nachgewiesen \(Tabelle 1\)\./);
  assert.match(t, /Bei den untersuchten Materialien handelt es sich nicht um asbesthaltige Materialien\./);
  assert.equal(m.unterschriften.length, 1);
  assert.equal(T.text(m.kopf[2]), 'AG: Muster Wohnbau eG, Am Feld 3, 12345 Musterstadt');
});

fall('Zugestellte Probe: Gewährleistung, nur Sachverständige(r), Betreff mit Eingangsdatum', () => {
  const m = T.bericht({ pj: D.pj({ versicherungsnehmer: '' }), lk: D.lk([[1, '', 'Keller', 'Dachplatte', 'Faserzementprodukte (z.B. Eternit)']]),
    erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter,
    form: form({ variante: 'zugestellt', eingangsdatum: '2026-10-13', agSatz: 'die Firma Beispiel Sanierung GmbH' }), fotos: { P1: [{ datei: 'a.jpg' }] } });
  const t = alles(m);
  assert.equal(T.text(m.deckblatt.betreff), 'Untersuchung auf Asbest – zugestellte Probe vom 13.10.2026');
  assert.match(t, /Am 13\.10\.2026 wurde unserem Büro durch die Firma Beispiel Sanierung GmbH eine Materialprobe aus dem Objekt Musterweg 12, 12345 Musterstadt zugestellt, verbunden mit dem Auftrag, diese auf Asbest untersuchen zu lassen\./);
  assert.match(t, /Die Probenahme erfolgte nicht durch unser Büro\. Angaben zu Material und Entnahmestelle wurden vom Auftraggeber übernommen\. Die Ergebnisse gelten ausschließlich für die zugestellte Probe\./);
  assert.match(t, /Die zugestellte Probe ist in Abbildung 1 dargestellt\./);
  assert.match(t, /Tabelle 1: Zugestellte Probe und Ergebnis/);
  assert.match(t, /Bei dem untersuchten Material handelt es sich nicht um ein asbesthaltiges Material\./);
  assert.doesNotMatch(t, /durch Herrn/);
  assert.equal(m.unterschriften.length, 1);
});

fall('Gemischt: zwei positiv, eine negativ; zwei Prüfberichte → Anlagen 1 und 2', () => {
  const e = D.erg([[1, 'chrysotil'], [2, 'kein']]);
  e.berichte.push({ ...D.erg([[3, 'chrysotil']], 'AR-999-2026-000002-01').berichte[0], id: 'b2' });
  const m = T.bericht({ pj: D.pj(), lk: D.lk([[1, '2026-10-08', 'Dach', 'Wellplatte', 'Faserzementprodukte (z.B. Eternit)'], [2, '2026-10-08', 'Flur', 'Putz', 'Putze / Spachtelmassen'], [3, '2026-10-09', 'Küche', 'Floor-Flex-Platte', 'Fußbodenplatten (Flexplatten)']]),
    erg: e, cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  const t = alles(m);
  assert.match(t, /Am 08\.10\.2026 und 09\.10\.2026 wurden durch Herrn Messer/);
  assert.match(t, /in den beigefügten Prüfberichten Nr\. AR-999-2026-000001-01 und Nr\. AR-999-2026-000002-01 dokumentiert \(Anlagen 1 und 2\)\./);
  assert.match(t, /In der übrigen Probe wurde kein Asbest nachgewiesen\./);
  assert.match(t, /Bei den Materialien „Wellplatte“ \(Probe 1\) und „Floor-Flex-Platte“ \(Probe 3\) handelt es sich um asbesthaltige Materialien\. Bei allen Tätigkeiten, bei denen diese Materialien bearbeitet, beschädigt oder entfernt werden/);
  assert.match(t, /Bei dem übrigen untersuchten Material handelt es sich nicht um ein asbesthaltiges Material\./);
  assert.equal(m.anlagen.length, 2);
  assert.deepEqual(m.anlagenTeile.map(x => x.label), ['Anlage 1:', 'Anlage 2:']);
  assert.deepEqual(m.anlagenTeile[1].zeilen.map(T.text), ['Prüfbericht Nr. AR-999-2026-000002-01', '(Eurofins Beispiel-Labor GmbH)']);
  assert.equal(T.text(m.anlagen[0]), 'Anlage 1: Prüfbericht Nr. AR-999-2026-000001-01 (Eurofins Beispiel-Labor GmbH)');
});

fall('KMF: KI aus Labordaten, WHO-Fasern, Einbaujahr unbekannt / vor 1996', () => {
  const basis = { pj: D.pj(), lk: D.lk([[1, '2026-10-08', 'Dachboden', 'Dämmstoff Mineralwolle', 'Sonstige']]), erg: D.erg([[1, 'kmf']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter };
  let t = alles(T.bericht({ ...basis, form: form() }));
  assert.equal(T.text(T.bericht({ ...basis, form: form() }).deckblatt.betreff), 'Untersuchung auf Asbest und künstliche Mineralfasern (KMF)');
  assert.match(t, /auf Asbest sowie künstliche Mineralfasern \(KMF\) untersuchen zu lassen/);
  assert.match(t, /An der Dämmstoffprobe wurde zusätzlich untersucht, ob es sich um WHO-Fasern handelt, und der Kanzerogenitätsindex \(KI\) bestimmt\./);
  assert.match(t, /In der Dämmstoffprobe \(Probe 1\) wurden WHO-Fasern nachgewiesen\. Der Prüfbericht weist einen Kanzerogenitätsindex von KI = 26 aus\./);
  assert.match(t, /Nach der seit 05\.06\.2026 geltenden Fassung der TRGS 905/);
  assert.match(t, /Das Einbaujahr des Dämmstoffs ist nicht bekannt\./);
  t = alles(T.bericht({ ...basis, form: form({ einbau: 'vor1996' }) }));
  assert.match(t, /Der Dämmstoff wurde vor 1996 eingebaut und ist nach TRGS 521 als alte Mineralwolle anzusehen\./);
});

fall('Fehlende Angaben werden Lücken, nichts wird erfunden', () => {
  const m = T.bericht({ pj: D.pj({ auftragsdatum: '' }), lk: D.lk([[1, '', 'Keller', '', 'Sonstige']]), erg: D.erg([[1, 'chrysotil']]),
    cfg: { personen: {} }, mitarbeiter: [], form: form({ probenehmer: '', sv: '', mt: '' }) });
  assert.deepEqual(m.luecken.sort(), ['[Auftragsdatum]', '[Labor]', '[Material]', '[Probenahmedatum]', '[Probenehmer]', '[Sachverständige(r)]'].sort());
  assert.ok(m.hinweise.some(h => /Material fehlt/.test(h)));
});

fall('VN ist selbst Auftraggeber, Lage vor der Adresse (wie 26.0512)', () => {
  const pj = D.pj({ auftraggeber: 'Muster Bauverein eG, Am Hang 4, 12345 Musterstadt', versicherungsnehmer: 'Muster Bauverein eG, Am Hang 4, 12345 Musterstadt',
    objekt: '2. OG rechts\nMusterweg 12\n12345 Musterstadt', zustaendig: { kuerzel: 'Neu' } });
  const lk = D.lk([[1, '2026-10-08', 'Wohnung 2. OG rechts', 'Bodenaufbau', 'Estriche']]);
  // ohne Wahl: Auftraggeber ist keine Versicherung → Deckblatt ohne Versicherung, mit Hinweis zum Umstellen
  let m = T.bericht({ pj, lk, erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  assert.equal(m.versicherungsfall, false); assert.deepEqual(m.deckblatt.felder.map(f => f[0]), ['Auftraggeber:', 'Schadenort:', 'Schaden-Nr.:']);
  assert.ok(m.hinweise.some(h => /Deckblatt ohne Versicherung \(VN eingetragen, aber der Auftraggeber ist keine Versicherung\)/.test(h)));
  // „mit Versicherung“ gewählt: Versicherer unbekannt → Lücke
  m = T.bericht({ pj, lk, erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: [...D.mitarbeiter, { ordnerKuerzel: 'Neu', name: 'Nils Neu' }],
    form: form({ probenehmer: 'Neu', sv: 'Neu', mt: '', deckblatt: 'versicherung' }) });
  const t = alles(m);
  assert.ok(!m.hinweise.some(h => /Deckblatt ohne Versicherung/.test(h)));
  assert.deepEqual(m.deckblatt.felder[2], ['Versicherer:', [{ gap: '[Versicherer]' }]]);
  assert.ok(m.luecken.includes('[Versicherer]'));
  assert.ok(m.hinweise.some(h => /Auftraggeber und VN sind gleich/.test(h)));
  assert.match(t, /wurde unser Büro durch die Muster Bauverein eG beauftragt, im Objekt Musterweg 12, 12345 Musterstadt \(2\. OG rechts\) eine Ortsbesichtigung/);
  assert.ok(m.hinweise.some(h => /Nils Neu hat die Proben genommen und unterschreibt als Sachverständige\(r\)/.test(h)));
  assert.deepEqual(m.deckblatt.felder[1][1], ['2. OG rechts', 'Musterweg 12', '12345 Musterstadt']);   // Deckblatt bleibt wie in der Projektzentrale
  m = T.bericht({ pj, lk, erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form({ deckblatt: 'versicherung', versicherer: 'Beispiel Versicherung AG', agSatz: 'den Vorstand des Bauvereins' }) });
  assert.deepEqual(m.deckblatt.felder[2], ['Versicherer:', ['Beispiel Versicherung AG']]);
  assert.match(alles(m), /durch den Vorstand des Bauvereins beauftragt/);
});

fall('Artikel für den Auftraggeber, Objekt im Satz', () => {
  const a = n => T.mitArtikel(n).text;
  assert.equal(a('Muster Wohnbau eG'), 'die Muster Wohnbau eG');
  assert.equal(a('Beispiel Bau GmbH & Co. KG'), 'die Beispiel Bau GmbH & Co. KG');
  assert.equal(a('Stadt Musterstadt'), 'die Stadt Musterstadt');
  assert.equal(a('WEG Musterweg 12'), 'die WEG Musterweg 12');
  assert.equal(a('Turnverein Musterstadt e.V.'), 'den Turnverein Musterstadt e.V.');
  assert.equal(a('Herr Max Muster'), 'Herrn Max Muster');
  assert.equal(a('Frau Erika Muster'), 'Frau Erika Muster');
  assert.equal(a('die Firma Beispiel'), 'die Firma Beispiel');
  assert.deepEqual(T.mitArtikel('Max Muster'), { text: 'Max Muster', artikel: false });
  assert.deepEqual(T.mitArtikel('Peter Neustadt'), { text: 'Peter Neustadt', artikel: false });
  assert.equal(a('Gemeinnützige Wohnungsbaugesellschaft Musterstadt'), 'die Gemeinnützige Wohnungsbaugesellschaft Musterstadt');
  assert.equal(a('Bauverein Bergisches Heim eG'), 'die Bauverein Bergisches Heim eG');
  assert.equal(T.objektImSatz('EG links, Musterweg 3, 12345 Musterstadt'), 'Musterweg 3, 12345 Musterstadt (EG links)');
  assert.equal(T.objektImSatz('Wohnung Meier\nMusterweg 3\n12345 Musterstadt'), 'Musterweg 3, 12345 Musterstadt (Wohnung Meier)');
  assert.equal(T.objektImSatz('Kita Sonnenschein, Musterweg 3, 12345 Musterstadt'), 'Kita Sonnenschein, Musterweg 3, 12345 Musterstadt');
  assert.equal(T.objektImSatz('Musterweg 12, 12345 Musterstadt'), 'Musterweg 12, 12345 Musterstadt');
});

fall('Versicherer: Projektzentrale vor Annahme aus dem Auftraggeber', () => {
  const basis = { lk: D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige']]), erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() };
  let m = T.bericht({ ...basis, pj: D.pj({ versicherer: 'Muster Assekuranz AG' }) });
  assert.deepEqual(m.deckblatt.felder[2], ['Versicherer:', ['Muster Assekuranz AG']]);
  assert.ok(!m.hinweise.some(h => /Versicherer angenommen/.test(h)));
  m = T.bericht({ ...basis, pj: D.pj() });
  assert.deepEqual(m.deckblatt.felder[2], ['Versicherer:', ['Beispiel Versicherung AG']]);
  assert.ok(m.hinweise.some(h => /Versicherer angenommen: Auftraggeber „Beispiel Versicherung AG“/.test(h)));
});

fall('Probenehmer: genauer Feldbogen-Treffer, eigene Auswahl, sonst „angenommen“', () => {
  const basis = { pj: D.pj(), lk: D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige']]), erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter };
  let q = T.bericht({ ...basis, feldbogen: { text: 'Max Messer', kuerzel: 'Mes' }, form: form() }).probenehmerQuelle;
  assert.equal(q.angenommen, false); assert.match(q.text, /Feldbogen.*Max Messer/);
  q = T.bericht({ ...basis, feldbogen: { text: 'M. Messer', kuerzel: '' }, form: form({ probenehmer: 'Tst' }) }).probenehmerQuelle;
  assert.equal(q.angenommen, true); assert.match(q.text, /Dr\. Tanja Test angenommen \(zuständig laut Ordner; Feldbogen „M\. Messer“ passt zu keinem Namen/);
  q = T.bericht({ ...basis, feldbogen: { text: 'Max Messer', kuerzel: 'Mes' }, form: form({ probenehmer: 'Tst' }) }).probenehmerQuelle;
  assert.equal(q.angenommen, true, 'Auswahl weicht vom Feldbogen ab');
  q = T.bericht({ ...basis, form: form({ probenehmer: 'Tst', pnQuelle: 'hand' }) }).probenehmerQuelle;
  assert.deepEqual(q, { angenommen: false, text: 'eigene Auswahl' });
  assert.equal(T.bericht({ ...basis, form: form({ variante: 'zugestellt' }) }).probenehmerQuelle, null);
});

fall('Entnahmestelle LabelKit ↔ Prüfbericht: gleich, abweichend, nicht abgleichbar (vorerst nur Hinweis)', () => {
  const lk = D.lk([[1, '2026-10-16', 'EG Küche', 'Fliesenkleber', 'Sonstige'], [2, '2026-10-16', 'EG Flur', 'Putz', 'Sonstige']]);
  const e = () => D.auftrag(D.erg([[1, 'chrysotil'], [2, 'kein']]), [[1, 'EG Küche, Fliesenkleber, fest gebunden'], [2, 'EG Flur, Putz – Decke']]);
  let m = T.bericht({ pj: D.pj(), lk, erg: D.berichtDesc(e(), { P1: 'EG  küche, Fliesenkleber, fest gebunden', P2: 'EG Flur, Putz - Decke' }), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  assert.deepEqual(m.proben.map(p => p.abgleich.ok), [true, true], 'Leerraum, Groß-/Kleinschreibung, Striche zählen nicht');
  assert.ok(!m.hinweise.some(h => /Entnahmestelle/.test(h)));
  m = T.bericht({ pj: D.pj(), lk, erg: D.berichtDesc(e(), { P1: 'EG Küche, Fliesenkleber, fest gebunden', P2: 'EG Bad, Putz – Decke' }), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  assert.ok(m.hinweise.includes('Probe 2: Entnahmestelle passt nicht – LabelKit „EG Flur, Putz – Decke“, Prüfbericht AR-999-2026-000001-01 „EG Bad, Putz – Decke“ → in LabelKit oder beim Labor klären.'));
  assert.deepEqual(m.sperren, [], 'noch keine Sperre');
  m = T.bericht({ pj: D.pj(), lk, erg: D.erg([[1, 'chrysotil'], [2, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  assert.ok(m.hinweise.some(h => /Entnahmestelle nicht mit dem Prüfbericht abgeglichen \(P1, P2\): ResultKit hat den LabelKit-Auftrag nicht gespeichert/.test(h)));
  assert.equal(T.beschreibungWeichtAb('A, Tiefe: 2 cm', 'a'), false); assert.equal(T.beschreibungWeichtAb('', 'x'), false);
});

fall('Sperren: fremde LabelKit-Datei, LabelKit-Probe ohne Ergebnis (abwählbar); Entwurf zum Herunterladen', () => {
  const basis = { pj: D.pj(), erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter };
  const lk2 = D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige'], [2, '2026-10-16', 'Dach', 'Wellplatte', 'Sonstige']]);
  let m = T.bericht({ ...basis, lk: lk2, form: form() });
  assert.deepEqual(m.sperren, ['P2: in LabelKit als Asbestprobe erfasst, aber noch kein Ergebnis in ResultKit – Ergebnis übernehmen oder die Probe unter „Proben“ abwählen.']);
  assert.deepEqual(m.offen.map(o => [o.label, o.material, o.aus]), [['P2', 'Wellplatte', false]]);
  m = T.bericht({ ...basis, lk: lk2, form: form({ aus: { P2: false } }) });
  assert.deepEqual(m.sperren, []); assert.equal(m.offen[0].aus, true);
  const fremd = { ...D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige']]), projekt: { nr: '99.9002' } };
  m = T.bericht({ ...basis, lk: fremd, ordner: { nr: '99.9001' }, form: form() });
  assert.deepEqual(m.sperren, ['Die LabelKit-Datei gehört zu Projekt 99.9002, nicht zu 99.9001 – in LabelKit/ResultKit prüfen.']);
  // Adresse im LabelKit-Feld „Projektnummer“ (ältere Projekte): gleiche Nummer → keine Sperre, andere Nummer → Sperre
  const mitOrt = nr => ({ ...D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige']]), projekt: { nr } });
  let m2 = T.bericht({ ...basis, lk: mitOrt('99.9001 Stegerwaldstraße Leverkusen'), ordner: { nr: '99.9001' }, form: form() });
  assert.deepEqual(m2.sperren, []);
  m2 = T.bericht({ ...basis, lk: mitOrt('99.9001_Stegerwaldstraße_Leverkusen'), ordner: { nr: '99.9001' }, form: form() });
  assert.deepEqual(m2.sperren, []);
  m2 = T.bericht({ ...basis, lk: mitOrt('99.9002 Stegerwaldstraße Leverkusen'), ordner: { nr: '99.9001' }, form: form() });
  assert.deepEqual(m2.sperren, ['Die LabelKit-Datei gehört zu Projekt 99.9002 Stegerwaldstraße Leverkusen, nicht zu 99.9001 – in LabelKit/ResultKit prüfen.']);
  assert.equal(T.projektNummer('26.0512 Stegerwaldstraße'), '26.0512');
  assert.equal(T.projektNummer('126.05123'), '');
  assert.equal(T.gleichesProjekt('2025-047', '2025-047'), true, 'ohne Projektnummer: ganzer Text wie bisher');
  assert.equal(T.gleichesProjekt('2025-047', '2025-048'), false);
  assert.equal(T.gleichesProjekt('26.0512', '26.05120'), false);
  const ent = T.alsEntwurf(m);
  assert.equal(ent.dateiname, '1._Mitteilung_99.9001_ENTWURF.docx');
  assert.deepEqual(ent.kennzeilen, [{ art: 'entwurf', text: 'ENTWURF – nicht versenden' }]);
  assert.equal(m.dateiname, '1._Mitteilung_99.9001.docx', 'Modell selbst unverändert');
});

fall('Vorläufiger Prüfbericht: Hinweis und Kopfzeile, keine Sperre; Anlagen-PDFs für die Übergabe', () => {
  const e = D.erg([[1, 'chrysotil']]); e.berichte[0].vorlaeufig = true;
  const m = T.bericht({ pj: D.pj(), lk: D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige']]), erg: e, cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  assert.deepEqual(m.sperren, []);
  assert.deepEqual(m.kennzeilen.map(k => k.art), ['vorlaeufig']);
  assert.equal(m.hinweise.filter(h => /ist vorläufig/.test(h)).length, 1);
  assert.deepEqual(m.anlagenDateien, ['Laborergebnisse/AR-999-2026-000001-01.pdf']);
  delete e.berichte[0].sources.pdf;
  const ohne = T.bericht({ pj: D.pj(), lk: D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige']]), erg: e, cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  assert.deepEqual(ohne.anlagenDateien, []); assert.ok(ohne.hinweise.some(h => /PDF nicht in „Laborergebnisse“/.test(h)));
});

fall('Einzelteile: Befund, Namen, Zahlwörter', () => {
  assert.deepEqual(T.asbestBefund(D.werte.chrysotil), { text: 'Chrysotil, 5 - 20 %', gefunden: true, eindeutig: true });
  assert.deepEqual(T.asbestBefund(D.werte.kein), { text: 'Kein Asbest nachgewiesen', gefunden: false, eindeutig: true });
  assert.equal(T.asbestBefund([{ p: 'Asbest', r: 'siehe Bemerkung', u: '' }]).eindeutig, false);
  assert.equal(T.person({ personen: { Ric: { geschlecht: 'w' } } }, [{ ordnerKuerzel: 'Ric', name: 'Dr. Ricarda Muster' }], 'Ric').satz, 'Frau Dr. Muster');
  assert.equal(T.person({ personen: { X: { geschlecht: 'w', name: 'M. Sc. Nadine Beispiel' } } }, [], 'X').satz, 'Frau Beispiel');
  assert.equal(T.zahlwort(12), 'zwölf'); assert.equal(T.zahlwort(13), '13');
  assert.equal(T.datumDE('2026-10-05'), '05.10.2026'); assert.equal(T.datumDE('5.10.2026'), '05.10.2026');
});

fall('Deckblatt mit/ohne Versicherung: automatisch und umstellbar (Hausverwaltung, Sanierer, Privat)', () => {
  const basis = { lk: D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige']]), erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter };
  const hv = D.pj({ auftraggeber: 'Muster Hausverwaltung GmbH, Hauptstr. 5, 12345 Musterstadt' });   // VN aus dem Arbeitszettel, aber keine Versicherung
  let m = T.bericht({ ...basis, pj: hv, form: form() });
  assert.equal(m.versicherungsfall, false);
  assert.deepEqual(m.deckblatt.felder, [['Auftraggeber:', ['Muster Hausverwaltung GmbH', 'Hauptstr. 5', '12345 Musterstadt']], ['Schadenort:', ['Musterweg 12', '12345 Musterstadt']], ['Schaden-Nr.:', ['BV-2026-0001']]]);
  assert.equal(T.text(m.kopf[2]), 'AG: Muster Hausverwaltung GmbH, Hauptstr. 5, 12345 Musterstadt');
  assert.equal(T.text(m.kopf[3]), 'Schadenort: Musterweg 12, 12345 Musterstadt');
  assert.ok(!m.hinweise.some(h => /Versicherer angenommen/.test(h)));
  // umgestellt auf „mit Versicherung“: Versicherer selbst eintragen (sonst würde die Hausverwaltung angenommen – mit Hinweis)
  m = T.bericht({ ...basis, pj: hv, form: form({ deckblatt: 'versicherung', versicherer: 'Muster Assekuranz AG' }) });
  assert.deepEqual(m.deckblatt.felder.map(f => f[0]), ['VN:', 'Risiko:', 'Versicherer:', 'Schaden-Nr.:']); assert.deepEqual(m.deckblatt.felder[2][1], ['Muster Assekuranz AG']);
  // Versicherer in der Projektzentrale → mit Versicherung, auch wenn der Auftraggeber ein Sanierer ist
  m = T.bericht({ ...basis, pj: D.pj({ auftraggeber: 'Muster Sanierung GmbH', versicherer: 'Beispiel Versicherung AG' }), form: form() });
  assert.equal(m.versicherungsfall, true); assert.deepEqual(m.deckblatt.felder[2], ['Versicherer:', ['Beispiel Versicherung AG']]);
  // … und umgekehrt „ohne“ gewählt
  m = T.bericht({ ...basis, pj: D.pj(), form: form({ deckblatt: 'direkt' }) });
  assert.deepEqual(m.deckblatt.felder.map(f => f[0]), ['Auftraggeber:', 'Schadenort:', 'Schaden-Nr.:']); assert.ok(!m.hinweise.some(h => /Deckblatt ohne Versicherung/.test(h)));
  // Privatauftrag ohne VN: ohne Versicherung, kein Hinweis
  m = T.bericht({ ...basis, pj: D.pj({ auftraggeber: 'Herr Max Muster', versicherungsnehmer: '' }), form: form() });
  assert.equal(m.versicherungsfall, false); assert.ok(!m.hinweise.some(h => /Deckblatt/.test(h)));
  // Erkennen von Versicherungen am Namen
  for (const n of ['Beispiel Versicherung AG', 'SV SparkassenVersicherung', 'Allianz Versicherungs-AG', 'AXA', 'ERGO Group', 'HUK-COBURG', 'Westfälische Provinzial', 'R+V Allgemeine', 'Gothaer', 'Muster Assekuranz AG', 'VHV'])
    assert.ok(T.istVersicherer(n), n);
  for (const n of ['Muster Hausverwaltung GmbH', 'Muster Sanierung GmbH', 'Herr Max Muster', 'Bauverein Bergisches Heim eG', 'Haxe & Co'])
    assert.ok(!T.istVersicherer(n), n);
});

fall('Unterschriften: Rolle je Unterschrift wählbar (Messtechniker allein, SV als zweite Unterschrift)', () => {
  const basis = { pj: D.pj(), lk: D.lk([[1, '2026-10-16', 'Keller', 'Putz', 'Sonstige']]), erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter };
  const u = f => T.bericht({ ...basis, form: form(f) }).unterschriften.map(x => x.rolle + ' ' + x.name);
  assert.deepEqual(u({ sv: 'Mes', mt: '' }), ['Der Messtechniker Max Messer'], 'Messtechniker allein: Rolle aus den Einstellungen');
  assert.deepEqual(u({ sv: 'Mes', mt: 'Tst' }), ['Der Messtechniker Max Messer', 'Die Sachverständige Dr. Tanja Test']);
  assert.deepEqual(u({ sv: 'Tst', rolle1: 'mt', mt: '' }), ['Die Messtechnikerin Dr. Tanja Test'], 'SV unterschreibt diesmal als Messtechnikerin');
  assert.deepEqual(u({ sv: 'Mes', rolle1: 'sv', mt: '' }), ['Der Sachverständige Max Messer']);
  assert.deepEqual(u({ sv: 'Tst', mt: 'Mes', rolle2: 'sv' }), ['Die Sachverständige Dr. Tanja Test', 'Der Sachverständige Max Messer']);
  assert.deepEqual(u({ sv: 'Tst', mt: 'Tst' }), ['Die Sachverständige Dr. Tanja Test'], 'gleiche Person nur einmal');
  assert.deepEqual(u({ sv: 'Tst', mt: 'Mes', variante: 'zugestellt' }), ['Die Sachverständige Dr. Tanja Test'], 'zugestellt: nur eine Unterschrift');
  assert.ok(!T.bericht({ ...basis, form: form({ sv: 'Mes', mt: '' }) }).hinweise.some(h => /unterschreibt hier aber/.test(h)));
});
fall('Frau/Herr ohne Einstellungen: Büro-Standard nach Nachname, Einstellung geht vor, Unterschrift ohne Anrede', () => {
  const buero = [{ ordnerKuerzel: 'Ric', name: 'Dr. Ricarda Pütt' }, { ordnerKuerzel: 'Nad', name: 'Nadine Jung' },
    { ordnerKuerzel: 'Ste', name: 'Stefan Cremer' }, { ordnerKuerzel: 'Dr.Ka', name: 'Dr. Sebastian Kasper' },
    { ordnerKuerzel: 'Ben', name: 'Benjamin Grund' }, { ordnerKuerzel: 'Luc', name: 'Lucas vom Dorp' }, { ordnerKuerzel: 'Neu', name: 'Nils Neu' }];
  const satz = k => T.person({ personen: {} }, buero, k).satz;
  assert.deepEqual(['Ric', 'Nad', 'Ste', 'Dr.Ka', 'Ben', 'Luc', 'Neu'].map(satz),
    ['Frau Dr. Pütt', 'Frau Jung', 'Herrn Cremer', 'Herrn Dr. Kasper', 'Herrn Grund', 'Herrn vom Dorp', 'Nils Neu']);
  assert.equal(T.person({ personen: { Nad: { geschlecht: 'm' } } }, buero, 'Nad').satz, 'Herrn Jung');   // Einstellung geht vor
  assert.equal(T.anredeStandard('Dr. Ricarda Pütt'), 'w');                                          // zerlegtes ü
  const m = T.bericht({ pj: D.pj(), lk: D.lk([[1, '2026-10-16', 'Umkleide Schwimmbad', 'Fliesenkleber', 'Bituminöse Proben / Kleber']]),
    erg: D.erg([[1, 'chrysotil']]), cfg: { personen: {} }, mitarbeiter: buero, form: form({ probenehmer: 'Ste', sv: 'Ric', mt: 'Ste' }) });
  assert.match(alles(m), /wurde durch Herrn Cremer \(Sachverständigenbüro/);
  assert.deepEqual(m.unterschriften.map(u => u.rolle + ' ' + u.name), ['Die Sachverständige Dr. Ricarda Pütt', 'Der Sachverständige Stefan Cremer']);
  assert.ok(!m.hinweise.some(h => /fehlt Frau\/Herr/.test(h)));
});

fall('Tabelle 1: Probe nur als Nummer, Nummer und Labor-Nr. zentriert; Material aus der Matrix, wenn „Bauteil / Material“ leer ist', () => {
  const m = T.bericht({ pj: D.pj(), lk: D.lk([[1, '2026-10-16', 'EG Bad', '', 'Putze / Spachtelmassen'], [2, '2026-10-16', 'EG Flur', 'Fliesenkleber', 'Putze / Spachtelmassen'], [3, '2026-10-16', 'Keller', '', 'Sonstige']]),
    erg: D.erg([[1, 'kein'], [2, 'kein'], [3, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  const tab = m.abschnitte.flatMap(a => a.inhalt).find(x => x.t === 'tab');
  assert.deepEqual(tab.zeilen.map(z => [z[0], z[3]]), [['1', 'Putz / Spachtelmasse'], ['2', 'Fliesenkleber'], ['3', '']]);
  assert.deepEqual(tab.kopf, ['Probe', 'Labor-Nr.', 'Entnahmestelle', 'Material', 'Ergebnis']);
  assert.deepEqual(tab.ausrichtung, ['center', 'center', 'left', 'left', 'left']);
  assert.ok(m.hinweise.some(h => /Probe 1: Material „Putz \/ Spachtelmasse“ aus der LabelKit-Matrix übernommen/.test(h)));
  assert.ok(m.hinweise.some(h => /Probe 3: Material fehlt/.test(h)));
  assert.equal(T.matrixMaterial('Faserzementprodukte (z.B. Eternit)'), 'Faserzement');
  assert.equal(T.matrixMaterial('Luft (Raumluft)'), '');
});

fall('Raum-Kürzel in der Entnahmestelle werden für den Bericht ausgeschrieben (Testbericht 26.0512)', () => {
  const m = T.bericht({ pj: D.pj({ versicherungsnehmer: '' }),
    lk: D.lk([[1, '2026-10-08', 'Wohnung 2. OG rechts Bodenaufbau SZ Unterseite', 'Estrich', 'Estriche'], [2, '2026-10-08', 'Wohnung 2. OG rechts Bodenaufbau WZ', 'Estrich', 'Estriche'],
      [3, '2026-10-08', 'TRH EG, Wandputz OG', 'Putz', 'Putze / Spachtelmassen']]),
    erg: D.erg([[1, 'kein'], [2, 'kein'], [3, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form(), fotos: { P2: [{ datei: '02_P2.jpg' }] } });
  const t = alles(m);
  assert.match(t, /\n1 \| [^|]+ \| Wohnung 2\. OG rechts Bodenaufbau Schlafzimmer Unterseite \| Estrich \|/);
  assert.match(t, /\n2 \| [^|]+ \| Wohnung 2\. OG rechts Bodenaufbau Wohnzimmer \| Estrich \|/);
  assert.match(t, /\n3 \| [^|]+ \| Treppenhaus EG, Wandputz OG \| Putz \|/);
  assert.match(t, /Abb\. 1: Estrich, Wohnung 2\. OG rechts Bodenaufbau Wohnzimmer\./);
  assert.ok(m.hinweise.some(h => h.includes('Abkürzungen ausgeschrieben (SZ → Schlafzimmer, WZ → Wohnzimmer, TRH → Treppenhaus)')));
  // nur ganze Wörter, genau so geschrieben; LabelKit-Text bleibt unverändert
  assert.equal(T.raumAusschreiben('SZW, Sz, MSZ, Bad').text, 'SZW, Sz, MSZ, Bad');
  assert.equal(T.raumAusschreiben('KiZ/GZ').text, 'Kinderzimmer/Gästezimmer');
  // AZ = Asbestzement im Asbestbericht – bleibt stehen (Codex-Hinweis PR #8)
  assert.equal(T.raumAusschreiben('Keller AZ-Rohr').text, 'Keller AZ-Rohr');
  assert.equal(T.raumAusschreiben('WZ AZ-Platte').text, 'Wohnzimmer AZ-Platte');
  assert.deepEqual(T.raumAusschreiben('').ersetzt, []);
  // ohne Kürzel kein Hinweis
  const m2 = T.bericht({ pj: D.pj(), lk: D.lk([[1, '2026-10-08', 'EG Flur', 'Putz', 'Putze / Spachtelmassen']]), erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form() });
  assert.ok(!m2.hinweise.some(h => /Abkürzungen ausgeschrieben/.test(h)));
});

console.log(`\n${n} Fälle bestanden.`);
