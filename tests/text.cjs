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
  assert.match(t, /Probe 1 \| 999-2026-0000101 \| Umkleide Schwimmbad \| Fliesenkleber \| Chrysotil, 5 - 20 %/);
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
  let m = T.bericht({ pj, lk, erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: [...D.mitarbeiter, { ordnerKuerzel: 'Neu', name: 'Nils Neu' }],
    form: form({ probenehmer: 'Neu', sv: 'Neu', mt: '' }) });
  const t = alles(m);
  assert.deepEqual(m.deckblatt.felder[2], ['Versicherer:', [{ gap: '[Versicherer]' }]]);
  assert.ok(m.luecken.includes('[Versicherer]'));
  assert.ok(m.hinweise.some(h => /Auftraggeber und VN sind gleich/.test(h)));
  assert.match(t, /wurde unser Büro durch die Muster Bauverein eG beauftragt, im Objekt Musterweg 12, 12345 Musterstadt \(2\. OG rechts\) eine Ortsbesichtigung/);
  assert.ok(m.hinweise.some(h => /Nils Neu hat die Proben genommen und unterschreibt als Sachverständige\(r\)/.test(h)));
  assert.deepEqual(m.deckblatt.felder[1][1], ['2. OG rechts', 'Musterweg 12', '12345 Musterstadt']);   // Deckblatt bleibt wie in der Projektzentrale
  m = T.bericht({ pj, lk, erg: D.erg([[1, 'kein']]), cfg: D.cfg, mitarbeiter: D.mitarbeiter, form: form({ versicherer: 'Beispiel Versicherung AG', agSatz: 'den Vorstand des Bauvereins' }) });
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

fall('Einzelteile: Befund, Namen, Zahlwörter', () => {
  assert.deepEqual(T.asbestBefund(D.werte.chrysotil), { text: 'Chrysotil, 5 - 20 %', gefunden: true, eindeutig: true });
  assert.deepEqual(T.asbestBefund(D.werte.kein), { text: 'Kein Asbest nachgewiesen', gefunden: false, eindeutig: true });
  assert.equal(T.asbestBefund([{ p: 'Asbest', r: 'siehe Bemerkung', u: '' }]).eindeutig, false);
  assert.equal(T.person({ personen: { Ric: { geschlecht: 'w' } } }, [{ ordnerKuerzel: 'Ric', name: 'Dr. Ricarda Muster' }], 'Ric').satz, 'Frau Dr. Muster');
  assert.equal(T.person({ personen: { X: { geschlecht: 'w', name: 'M. Sc. Nadine Beispiel' } } }, [], 'X').satz, 'Frau Beispiel');
  assert.equal(T.zahlwort(12), 'zwölf'); assert.equal(T.zahlwort(13), '13');
  assert.equal(T.datumDE('2026-10-05'), '05.10.2026'); assert.equal(T.datumDE('5.10.2026'), '05.10.2026');
});

console.log(`\n${n} Fälle bestanden.`);
