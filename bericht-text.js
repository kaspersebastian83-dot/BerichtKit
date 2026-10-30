/* BerichtKit – Textbausteine und Berichtsmodell (ohne Browserteile, in Node testbar).
   Grundlage: Doc „Textbausteine Asbest-Untersuchungsbericht“ (Stand 30.10.2026).
   Regeln: Laborwerte und Probenbezeichnungen kommen unverändert aus ResultKit (_Ergebnisse.json) und LabelKit –
   hier wird nichts umgerechnet oder umformuliert. Fehlende Angaben werden als [Lücke] markiert (gelb im Bericht),
   nie erfunden. Materialnamen stehen nur im Nominativ (in Anführungszeichen oder hinter Doppelpunkt). */
(function (root) {
'use strict';

/* ---------- kleine Helfer ---------- */
const s = v => (v == null ? '' : String(v)).trim();
const ZAHLWORT = ['', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
const zahlwort = n => (n >= 1 && n <= 12 ? ZAHLWORT[n] : String(n));
/** ISO JJJJ-MM-TT → TT.MM.JJJJ; schon deutsches Datum bleibt. */
function datumDE(v) {
  const t = s(v); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  return m ? `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}.${m[3]}` : t;
}
/** Aufzählung „A“, „A und B“, „A, B und C“ */
function liste(xs) { xs = xs.filter(Boolean); return xs.length < 2 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' und ' + xs[xs.length - 1]; }
/** Lücke: Wert oder markierte Platzhalter-Lücke */
const L = (wert, name) => (s(wert) ? s(wert) : { gap: `[${name}]` });
/** Zeilen einer Adress-Zeichenkette „Name, Straße, PLZ Ort“ */
function zeilen(v) { return s(v).split(/\s*[\n;]\s*|,\s+/).map(x => x.trim()).filter(Boolean); }
/** Erste Zeile (Name) */
const nameVon = v => zeilen(v)[0] || '';
const PNR = v => { const m = /(\d+)\s*$/.exec(s(v)); return m ? +m[1] : null; };
const gleicherName = (a, b) => !!a && a.toLowerCase().replace(/\s+/g, ' ') === s(b).toLowerCase().replace(/\s+/g, ' ');

/* ---------- Entnahmestelle: LabelKit ↔ Prüfbericht (Regel wie ResultKit src/ergebnisse.ts) ---------- */
const tidy = v => String(v == null ? '' : v).normalize('NFC').replace(/\s+/g, ' ').trim();
/** Probenbeschreibung vergleichbar machen. Eurofins übernimmt den Text der LabelKit-Laborübergabe wörtlich (geprüft an 15 echten
    Asbestproben, 30.10.2026 – sogar Tippfehler bleiben stehen); angeglichen werden nur Leerraum, Groß-/Kleinschreibung, Striche
    und Anführungszeichen. In ResultKit (src/ergebnisse.ts) gleich halten. */
const beschreibungKey = v => tidy(v).toLowerCase().replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[\u201E\u201C\u201D\u201A\u2018\u2019\u00AB\u00BB"']/g, '"');
/** Weicht die Beschreibung im Prüfbericht von der aus LabelKit ab? Nie bei fehlendem Text und bei Bohrkernen (andere Reihenfolge
    in der Übergabe); „Tiefe: …“ am Ende zählt nicht (LabelKit übergibt sie nur bei Bohrmehl). */
function beschreibungWeichtAb(auftrag, bericht, art = '') {
  if (!tidy(auftrag) || !tidy(bericht) || /bohrkern/i.test(art)) return false;
  const a = beschreibungKey(auftrag), b = beschreibungKey(bericht);
  return a !== b && a.replace(/, tiefe: [^,]*$/, '') !== b;
}
/** Abweichende Entnahmestelle sperrt das Speichern noch nicht – erst nach dem Gegentest mit echten Projekten auf true setzen. */
const ABGLEICH_SPERRT = false;

/* ---------- Auftraggeber und Objekt im Fließtext ---------- */
/** Auftraggeber mit Artikel für „… durch <X> beauftragt / zugestellt“ (Akkusativ). Unbekannt → unverändert, artikel:false. */
const SCHON_MIT = /^(?:die|der|den|das|dem|des|Herrn|Frau|Firma|Fa\.|Familie|Eheleute)\s/i;
const DIE = /\b(?:g?GmbH|mbH|mbB|AG|eG|KG|KGaA|OHG|oHG|GbR|UG|SE|PartG\w*|Ltd\.?)(?=$|[\s,.&)])|(?:gesellschaft|genossenschaft|gemeinschaft|versicherung|verwaltung|stiftung|gemeinde|anstalt|kasse|bank|universität|hochschule)\b|^(?:Stadt|WEG)\b/i;
const DEN = /\b(?:e\.\s?V\.|Verein|Verband|Kreis|Landkreis|Zweckverband|Eigenbetrieb)(?=$|[\s,.)])/i;
const DAS = /^(?:Land|Bistum|Erzbistum|Amt|Unternehmen)\s/i;
function mitArtikel(name) {
  const n = s(name); if (!n) return { text: '', artikel: true };
  if (SCHON_MIT.test(n)) return { text: n, artikel: true };
  if (/^Herr\s/i.test(n)) return { text: n.replace(/^Herr\s/i, 'Herrn '), artikel: true };
  if (DAS.test(n)) return { text: 'das ' + n, artikel: true };
  if (DEN.test(n)) return { text: 'den ' + n, artikel: true };
  if (DIE.test(n)) return { text: 'die ' + n, artikel: true };
  return { text: n, artikel: false };
}
/** Objekt für den Fließtext: steht die Lage (z. B. „2. OG rechts“, „Wohnung …“) vor der Adresse, kommt sie in Klammern ans Ende. */
const LAGE = /^(?:Wohnung|Whg\.?|Etage|Einheit|Büro|Laden|Praxis)\b|\b(?:\d+\.\s*)?(?:OG|EG|DG|UG|KG|SB|Obergeschoss|Erdgeschoss|Dachgeschoss|Untergeschoss|Kellergeschoss|Souterrain|Hochparterre)\b/i;
const STRASSE = /\d+\s*[a-z]?(?:\s*[-–\/]\s*\d+\s*[a-z]?)?$|(?:str\.|straße|strasse|weg|platz|allee|ring|gasse|damm|ufer|chaussee)\b/i;
function objektImSatz(v) {
  const z = zeilen(v);
  if (z.length > 1 && LAGE.test(z[0]) && !STRASSE.test(z[0]) && !/^\d{5}\s/.test(z[0])) return `${z.slice(1).join(', ')} (${z[0]})`;
  return z.join(', ');
}

/* ---------- Asbest-Befund (Logik wie ResultKit asbestBefund, src/uebersicht.ts – Trenner im Bericht „, “) ---------- */
const ASBEST = /asbest|chrysotil|amosit|krokydolith|tremolit|aktinolith|anthophyllit/i;
const POSITIV = /nachgewiesen|positiv|enthalten|gefunden|^ja$|chrysotil|amosit|krokydolith|tremolit|aktinolith|anthophyllit/i;
const NEGATIV = /nicht|kein|negativ|n\.\s*n\.|^<|unter/i;
const GEHALT = /^asbestgehalt\b/i, ART = /^asbest(?:art)?\b/i;
const gehaltPositiv = w => GEHALT.test(s(w.p)) && /\d/.test(w.r) && !/^\s*</.test(w.r) && !NEGATIV.test(s(w.r));
function asbestBefund(werte) {
  const a = (werte || []).filter(w => ASBEST.test(w.p || '') && !/^[-–—]?$/.test(s(w.r)));
  if (!a.length) return null;
  const teil = w => GEHALT.test(s(w.p)) ? `${s(w.r)}${s(w.u) && /\d/.test(w.r) ? ` ${s(w.u)}` : ''}`
    : ART.test(s(w.p)) ? s(w.r) : `${s(w.p)}: ${s(w.r)}`;
  const sortiert = [...a.filter(w => !GEHALT.test(s(w.p))), ...a.filter(w => GEHALT.test(s(w.p)))];
  const text = [...new Set(sortiert.map(teil))].join(', ');
  const gefunden = a.some(w => (POSITIV.test(s(w.r)) && !NEGATIV.test(s(w.r))) || gehaltPositiv(w));
  const negativ = !gefunden && a.every(w => NEGATIV.test(s(w.r)) || /^[-–—]?$/.test(s(w.r)));
  return { text, gefunden, eindeutig: gefunden || negativ };
}
/** KMF-Angaben aus den Laborwerten (ResultKit liest sie als normale Werte) */
const KI = /\bKI\b|kanzerogenit/i, WHO = /WHO|mineralfaser|\bKMF\b/i;
function kmfWerte(werte) {
  const ki = (werte || []).find(w => KI.test(w.p || '') && s(w.r) && !/^[-–—]$/.test(s(w.r)));
  const who = (werte || []).find(w => WHO.test(w.p || '') && !KI.test(w.p || '') && s(w.r) && !/^[-–—]$/.test(s(w.r)));
  return { ki: ki ? s(ki.r) : '', who: who ? `${s(who.p)}: ${s(who.r)}${s(who.u) ? ' ' + s(who.u) : ''}` : '',
    whoPositiv: who ? (POSITIV.test(s(who.r)) || (/\d/.test(who.r) && !NEGATIV.test(s(who.r)))) && !NEGATIV.test(s(who.r)) : null };
}
const IST_KMF = /KMF|mineralwolle|glaswolle|steinwolle|dämm|daemm|mineralfaser/i;

/* ---------- Personen ---------- */
const TITEL = /^(?:Dr\.|Prof\.|Dipl\.-\S+|M\.\s?Sc\.|B\.\s?Sc\.|M\.|Sc\.)$/;
/** „Dr. Ricarda Pütt“ → {titel:'Dr.', nachname:'Pütt'}; „Lucas vom Dorp“ → nachname „vom Dorp“ */
function namensteile(name) {
  const w = s(name).split(/\s+/).filter(Boolean); const titel = [];
  while (w.length > 1 && TITEL.test(w[0])) titel.push(w.shift());
  const nachname = w.length > 1 ? w.slice(1).join(' ') : (w[0] || '');
  return { titel: titel.filter(t => /^(Dr\.|Prof\.)$/.test(t)).join(' '), nachname };
}
/** Person für Bericht: {kuerzel, name, rolle:'sv'|'mt', geschlecht:'w'|'m'|'', satz} */
function person(cfg, mitarbeiter, kuerzel) {
  const k = s(kuerzel); if (!k) return null;
  const ma = (mitarbeiter || []).find(p => s(p.ordnerKuerzel).toLowerCase() === k.toLowerCase()) || {};
  const c = ((cfg && cfg.personen) || {})[k] || {};
  const name = s(c.name) || s(ma.name) || k;
  const g = c.geschlecht === 'w' || c.geschlecht === 'm' ? c.geschlecht : '';
  const t = namensteile(name);
  const satz = s(c.satz) || (g ? `${g === 'w' ? 'Frau' : 'Herrn'} ${t.titel ? t.titel + ' ' : ''}${t.nachname}` : name);
  return { kuerzel: k, name, rolle: c.rolle === 'mt' ? 'mt' : 'sv', geschlecht: g, satz };
}
function rollentext(p) {
  if (p.rolle === 'mt') return p.geschlecht === 'w' ? 'Die Messtechnikerin' : 'Der Messtechniker';
  return p.geschlecht === 'w' ? 'Die Sachverständige' : p.geschlecht === 'm' ? 'Der Sachverständige' : 'Sachverständige(r)';
}

/* ---------- Proben zusammenführen ---------- */
/** LabelKit-Asbestproben nach Label „P<n>“ (Nummer wie LabelKit: _nr, sonst id) */
function labelkitAsbest(lk) {
  const m = new Map();
  for (const p of (lk && Array.isArray(lk.asbestProben) ? lk.asbestProben : [])) {
    const n = p._nr != null && p._nr !== '' ? +p._nr : +p.id; if (!n) continue;
    m.set('P' + n, { nr: n, datum: s(p.datum), stelle: s(p.z2), material: s(p.z3), matrix: s(p.matrix) });
  }
  return m;
}
/** Alle Proben mit Asbest- oder KMF-Ergebnis aus _Ergebnisse.json, angereichert mit LabelKit.
    abgleich: Beschreibung aus dem LabelKit-Auftrag (auftrag.proben[].desc, wie ResultKit ihn übernommen hat) gegen die aus dem
    Prüfbericht (berichte[].proben[].desc) – ok: true/false, null = nicht abgleichbar (kein Auftrag oder kein Text).
    offen: LabelKit-Asbestproben ohne Ergebnis. */
function probenSammeln(erg, lk) {
  const lkm = labelkitAsbest(lk), out = [], gesehen = new Set();
  const berichte = erg && Array.isArray(erg.berichte) ? erg.berichte : [];
  const auftrag = erg && erg.auftrag && Array.isArray(erg.auftrag.proben) ? new Map(erg.auftrag.proben.filter(a => a && a.label).map(a => [s(a.label), a])) : null;
  for (const b of berichte) for (const p of (b.proben || [])) {
    const werte = p.werte || [];
    const befund = asbestBefund(werte), kmf = kmfWerte(werte);
    if (!(p.typ === 'Asbest' || befund || kmf.ki || kmf.who)) continue;
    const label = s(p.label) || (PNR(p.ref) ? 'P' + PNR(p.ref) : s(p.ref));
    if (gesehen.has(label + '|' + b.bericht)) continue; gesehen.add(label + '|' + b.bericht);
    const l = lkm.get(label) || {}, a = auftrag && auftrag.get(label);
    const abgleich = { labelkit: a ? tidy(a.desc) : '', bericht: tidy(p.desc), auftrag: !!auftrag };
    abgleich.ok = abgleich.labelkit && abgleich.bericht ? !beschreibungWeichtAb(a.desc, p.desc, s(p.art)) : null;
    out.push({ label, nr: l.nr || PNR(p.ref) || PNR(label), ref: s(p.ref), labNr: s(p.labNr), bericht: s(b.bericht || p.bericht),
      stelle: l.stelle || s(p.raum) || '', material: l.material || '', matrix: l.matrix || s(p.art),
      datum: l.datum || s(p.datum), befund, kmf, vorlaeufig: !!b.vorlaeufig, abgleich });
  }
  out.sort((a, b) => (a.nr || 0) - (b.nr || 0));
  const offen = [...lkm].filter(([k]) => !out.some(p => p.label === k)).map(([label, l]) => ({ label, nr: l.nr, stelle: l.stelle, material: l.material }));
  return { proben: out, offen };
}

/* ---------- Projektdaten ---------- */
function projektSicht(pj, ordner) {
  pj = pj || {};
  const vn = s(pj.versicherungsnehmer), ag = s(pj.auftraggeber), objekt = s(pj.objekt);
  const versicherungsfall = !!vn;
  return { nr: s(pj.projektnummer) || s(ordner && ordner.nr), versicherungsfall, vn, ag, objekt, versicherer: s(pj.versicherer),
    schadennummer: s(pj.schadennummer), auftragsdatum: s(pj.auftragsdatum), zustaendig: s(pj.zustaendig && pj.zustaendig.kuerzel) || s(ordner && ordner.kuerzel),
    sachverstaendiger: s(pj.sachverstaendiger) };
}

/* ---------- Berichtsmodell ----------
   eingabe = { pj, ordner:{name,nr,kuerzel}, lk, erg, cfg, mitarbeiter, fotos:{label:[{datei,...}]},
               feldbogen:{ text, kuerzel } (Probenehmer laut LabelKit-Feldbogen, kuerzel nur bei genauem Treffer),
               form:{ datum, mitteilung, variante:'eigen'|'zugestellt', eingangsdatum, auftragsdatum, agSatz, versicherer,
                      probenahmedatum, probenehmer, pnQuelle:'hand'|undefined, sv, mt, labor, aus:{label:false}, kmf:{label:true},
                      who:{label:true}, ki:{label:'25'}, foto:{label:'datei'|''}, einbau:'vor1996'|'unbekannt' } }
   Ergebnis: { dateiname, deckblatt, kopf, kennzeilen[], abschnitte, unterschriften, anlagen, anlagenDateien[], luecken[], hinweise[],
               sperren[], probenehmerQuelle, offen[] }
   sperren: Die Daten passen nicht zusammen – dann nicht in „Mitteilungen“ speichern, nur als Entwurf herunterladen (alsEntwurf).
   Lücken sperren nicht: Die füllt der SV in Word aus; ob welche übrig sind, prüft die Übergabe ans Büro. */
function bericht(eingabe) {
  const e = eingabe || {}, f = e.form || {}, P = projektSicht(e.pj, e.ordner);
  const hinweise = [], sperren = [];
  const { proben: alle, offen: offenAlle } = probenSammeln(e.erg, e.lk);
  const proben = alle.filter(p => !(f.aus && f.aus[p.label] === false));
  const offen = offenAlle.map(o => ({ ...o, aus: !!(f.aus && f.aus[o.label] === false) }));
  // LabelKit-Datei eines anderen Projekts: nichts daraus darf in den Bericht
  const lkNr = s(e.lk && e.lk.projekt && e.lk.projekt.nr), nr = s(e.ordner && e.ordner.nr) || P.nr;
  if (lkNr && nr && lkNr !== nr) sperren.push(`Die LabelKit-Datei gehört zu Projekt ${lkNr}, nicht zu ${nr} – in LabelKit/ResultKit prüfen.`);
  offen.filter(o => !o.aus).forEach(o => sperren.push(`${o.label}: in LabelKit als Asbestprobe erfasst, aber noch kein Ergebnis in ResultKit – Ergebnis übernehmen oder die Probe unter „Proben“ abwählen.`));
  proben.forEach(p => {
    p.istKmf = f.kmf && p.label in f.kmf ? !!f.kmf[p.label] : (IST_KMF.test(p.material + ' ' + p.matrix) || !!p.kmf.ki || !!p.kmf.who);
    p.ki = p.kmf.ki || s(f.ki && f.ki[p.label]);
    p.kiQuelle = p.kmf.ki ? 'labor' : (p.ki ? 'hand' : '');
    p.whoNachgewiesen = f.who && p.label in f.who ? !!f.who[p.label] : !!p.kmf.whoPositiv;
    p.foto = f.foto && p.label in f.foto ? f.foto[p.label] : ((e.fotos && e.fotos[p.label] && e.fotos[p.label][0] && e.fotos[p.label][0].datei) || '');
    if (p.vorlaeufig) hinweise.push(`Prüfbericht ${p.bericht} ist vorläufig – der Bericht bekommt die Kopfzeile „Vorläufig“.`);
    if (p.abgleich.ok === false) (ABGLEICH_SPERRT ? sperren : hinweise).push(`${p.ref || p.label}: Entnahmestelle passt nicht – LabelKit „${p.abgleich.labelkit}“, Prüfbericht ${p.bericht} „${p.abgleich.bericht}“ → in LabelKit oder beim Labor klären.`);
    if (p.befund && !p.befund.eindeutig) hinweise.push(`${p.ref || p.label}: Ergebnis „${p.befund.text}“ nicht eindeutig – bitte im Prüfbericht prüfen.`);
    if (!p.material) hinweise.push(`${p.ref || p.label}: Material fehlt (LabelKit „Bauteil / Material“).`);
    if (p.istKmf && !p.ki) hinweise.push(`${p.ref || p.label}: KI-Wert fehlt in den Labordaten – bitte aus dem Prüfbericht eintragen.`);
  });
  const ohneAbgleich = proben.filter(p => p.abgleich.ok === null);
  if (ohneAbgleich.length) hinweise.push(`Entnahmestelle nicht mit dem Prüfbericht abgeglichen (${ohneAbgleich.map(p => p.label).join(', ')}): `
    + (ohneAbgleich.some(p => !p.abgleich.auftrag) ? 'ResultKit hat den LabelKit-Auftrag nicht gespeichert – in ResultKit die Ergebnisse erneut übernehmen.' : 'Beschreibung fehlt (z. B. nur PDF) – bitte selbst vergleichen.'));
  if (!proben.length) hinweise.push('Keine Asbestergebnisse gefunden – zuerst in ResultKit die Laborergebnisse übernehmen.');

  const n = proben.length, eine = n === 1;
  const kmfProben = proben.filter(p => p.istKmf);
  const pos = proben.filter(p => p.befund && p.befund.gefunden);
  const neg = proben.filter(p => p.befund && !p.befund.gefunden && p.befund.eindeutig);
  const unklar = proben.filter(p => !p.befund || !p.befund.eindeutig);
  const labor = s(f.labor) || s(e.cfg && e.cfg.labor);
  const berichtNr = [...new Set(proben.map(p => p.bericht).filter(Boolean))];
  const datum = datumDE(f.datum);
  const mitteilung = `${+f.mitteilung || 1}. Mitteilung`;

  const zugestellt = f.variante === 'zugestellt';
  // Personen
  const pn = person(e.cfg, e.mitarbeiter, f.probenehmer), sv = person(e.cfg, e.mitarbeiter, f.sv);
  const probenehmerQuelle = pnQuelle(f, e.feldbogen, zugestellt, pn, P.zustaendig);
  const mt = zugestellt ? null : person(e.cfg, e.mitarbeiter, f.mt);

  // Betreff
  const mitKmf = kmfProben.length > 0;
  let betreff = mitKmf ? 'Untersuchung auf Asbest und künstliche Mineralfasern (KMF)' : 'Untersuchung auf Asbest';
  const betreffRuns = [betreff];
  if (zugestellt) betreffRuns.push(` – zugestellte ${eine ? 'Probe' : 'Proben'} vom `, L(datumDE(f.eingangsdatum), 'Eingangsdatum'));

  // Deckblatt-Feldblock
  const felder = [];
  // Versicherer: Eingabe, dann Feld „Versicherer“ der Projektzentrale, sonst angenommen: Auftraggeber (der Arbeitszettel-Import
  // schreibt im Versicherungsfall die Versicherung dorthin) – aber nicht, wenn der Auftraggeber der VN selbst ist (→ Lücke).
  const agIstVn = P.versicherungsfall && gleicherName(nameVon(P.ag), nameVon(P.vn));
  const versicherer = s(f.versicherer) || nameVon(P.versicherer) || (agIstVn ? '' : nameVon(P.ag));
  if (P.versicherungsfall && !s(f.versicherer) && !P.versicherer) {
    if (agIstVn) hinweise.push('Auftraggeber und VN sind gleich – Versicherer bitte unter „Versicherer“ eintragen.');
    else if (versicherer) hinweise.push(`Versicherer angenommen: Auftraggeber „${versicherer}“ – bitte prüfen (in der Projektzentrale „Versicherer“ eintragen).`);
  }
  if (P.versicherungsfall) {
    felder.push(['VN:', zeilen(P.vn)], ['Risiko:', zeilen(P.objekt)], ['Versicherer:', [versicherer].filter(Boolean)]);
  } else {
    felder.push(['Auftraggeber:', zeilen(P.ag)], ['Schadenort:', zeilen(P.objekt)]);
  }
  if (P.schadennummer) felder.push(['Schaden-Nr.:', [P.schadennummer]]);
  felder.forEach(([k, v]) => { if (!v.length) v.push({ gap: `[${k.replace(':', '')}]` }); });

  const kopf = [`Untersuchungsbericht vom ${datum}`, betreffRuns,
    P.versicherungsfall ? ['VN: ', L(zeilen(P.vn).join(', '), 'VN')] : ['AG: ', L(zeilen(P.ag).join(', '), 'Auftraggeber')],
    [P.versicherungsfall ? 'Risiko: ' : 'Schadenort: ', L(zeilen(P.objekt).join(', '), 'Objekt')]];

  /* 1. Veranlassung */
  const objekt = L(objektImSatz(P.objekt), 'Objekt');
  // Auftraggeber im Satz: eigene Eingabe bleibt, wie sie ist; der unveränderte Name aus der Projektzentrale bekommt den Artikel.
  const agEingabe = s(f.agSatz), agName = nameVon(P.ag);
  const agArt = !agEingabe || agEingabe === agName ? mitArtikel(agName) : { text: agEingabe, artikel: true };
  if (agArt.text && !agArt.artikel) hinweise.push(`Auftraggeber im Satz: „durch ${agArt.text} beauftragt“ – Artikel prüfen (z. B. „die …“, „Herrn …“).`);
  const agSatz = L(agArt.text, 'Auftraggeber');
  const v = [];
  if (!zugestellt) {
    v.push({ t: 'p', runs: ['Am ', L(datumDE(f.auftragsdatum || P.auftragsdatum), 'Auftragsdatum'), ' wurde unser Büro durch ', agSatz,
      ' beauftragt, im Objekt ', objekt, ' eine Ortsbesichtigung durchzuführen, Materialproben zu entnehmen und diese auf Asbest ',
      mitKmf ? 'sowie künstliche Mineralfasern (KMF) ' : '', 'untersuchen zu lassen.'] });
  } else {
    v.push({ t: 'p', runs: ['Am ', L(datumDE(f.eingangsdatum), 'Eingangsdatum'), ' wurde unserem Büro durch ', agSatz, ' ',
      eine ? 'eine Materialprobe' : `${zahlwort(n)} Materialproben`, ' aus dem Objekt ', objekt,
      ' zugestellt, verbunden mit dem Auftrag, diese auf Asbest ', mitKmf ? 'sowie künstliche Mineralfasern (KMF) ' : '', 'untersuchen zu lassen.'] });
    v.push({ t: 'p', runs: ['Die Probenahme erfolgte nicht durch unser Büro. Angaben zu Material und Entnahmestelle wurden vom Auftraggeber übernommen. ',
      `Die Ergebnisse gelten ausschließlich für die zugestellte${eine ? ' Probe' : 'n Proben'}.`] });
  }

  /* 2. Probenahme und Untersuchung */
  const mitFoto = proben.filter(p => p.foto);
  const abb = new Map(); mitFoto.forEach((p, i) => abb.set(p.label, i + 1));
  const abbVerweis = !mitFoto.length ? '' : mitFoto.length === 1 ? 'Abbildung 1' : `den Abbildungen 1 bis ${mitFoto.length}`;
  const pr = [];
  if (!zugestellt) {
    const daten = s(f.probenahmedatum) ? [datumDE(f.probenahmedatum)] : [...new Set(proben.map(p => datumDE(p.datum)).filter(Boolean))];
    pr.push({ t: 'p', runs: ['Am ', daten.length ? liste(daten) : { gap: '[Probenahmedatum]' }, eine ? ' wurde durch ' : ' wurden durch ',
      pn ? pn.satz : { gap: '[Probenehmer]' }, ' (Sachverständigenbüro Dr. Heinz Schiffers & Partner) im Objekt ',
      eine ? 'eine Materialprobe' : `${zahlwort(n)} Materialproben`, ' entnommen. ',
      eine ? 'Die Entnahmestelle ist in Tabelle 1 aufgeführt' : 'Die Entnahmestellen sind in Tabelle 1 aufgeführt',
      abbVerweis ? ` und in ${abbVerweis} dokumentiert.` : '.'] });
  } else if (abbVerweis) {
    pr.push({ t: 'p', runs: [eine ? `Die zugestellte Probe ist in ${abbVerweis} dargestellt.` : `Die zugestellten Proben sind in ${abbVerweis} dargestellt.`] });
  }
  const nrText = berichtNr.length ? liste(berichtNr.map(x => 'Nr. ' + x)) : { gap: '[Prüfbericht-Nr.]' };
  const anl = berichtNr.length <= 1 ? '(Anlage 1)' : berichtNr.length === 2 ? '(Anlagen 1 und 2)' : `(Anlagen 1 bis ${berichtNr.length})`;
  pr.push({ t: 'p', runs: [eine ? 'Die Probe wurde der ' : 'Die Proben wurden der ', L(labor, 'Labor'), ' zur Untersuchung auf Asbest übergeben. ',
    berichtNr.length > 1 ? 'Die Ergebnisse sind in den beigefügten Prüfberichten ' : 'Die Ergebnisse sind im beigefügten Prüfbericht ', nrText, ` dokumentiert ${anl}.`] });
  if (mitKmf) pr.push({ t: 'p', runs: [kmfProben.length === 1 ? 'An der Dämmstoffprobe wurde' : 'An den Dämmstoffproben wurde',
    ' zusätzlich untersucht, ob es sich um WHO-Fasern handelt, und der Kanzerogenitätsindex (KI) bestimmt.'] });
  mitFoto.forEach(p => pr.push({ t: 'fig', label: p.label, datei: p.foto,
    caption: `Abb. ${abb.get(p.label)}: ${p.material || p.ref}${p.stelle ? ', ' + p.stelle : ''}.` }));

  /* 3. Befund */
  const tab = { t: 'tab', caption: `Tabelle 1: ${zugestellt ? 'Zugestellte' : 'Entnommene'} ${eine ? 'Probe und Ergebnis' : 'Proben und Ergebnisse'}`,
    kopf: ['Probe', 'Labor-Nr.', 'Entnahmestelle', 'Material', 'Ergebnis'],
    zeilen: proben.map(p => [p.ref || p.label, p.labNr, p.stelle, p.material, p.befund ? p.befund.text : '–']) };
  const bf = [tab];
  if (pos.length === 0 && unklar.length === 0 && n) {
    bf.push({ t: 'p', runs: [eine ? 'In der Probe wurde kein Asbest nachgewiesen (Tabelle 1).' : `In keiner der ${zahlwort(n)} Proben wurde Asbest nachgewiesen (Tabelle 1).`] });
  } else {
    pos.forEach(p => bf.push({ t: 'p', runs: [`In ${p.ref || 'Probe ' + p.nr} (Material: `, L(p.material, 'Material'), `) wurde Asbest nachgewiesen: ${p.befund.text}.`] }));
    unklar.forEach(p => bf.push({ t: 'p', runs: [`Für ${p.ref || 'Probe ' + p.nr} (Material: `, L(p.material, 'Material'), `) weist der Prüfbericht aus: ${p.befund ? p.befund.text : '–'}.`] }));
    if (neg.length) bf.push({ t: 'p', runs: [neg.length === 1 ? 'In der übrigen Probe wurde kein Asbest nachgewiesen.' : 'In den übrigen Proben wurde kein Asbest nachgewiesen.'] });
  }
  kmfProben.forEach(p => {
    const txt = [p.whoNachgewiesen ? `In der Dämmstoffprobe (${p.ref || 'Probe ' + p.nr}) wurden WHO-Fasern nachgewiesen.`
      : `In der Dämmstoffprobe (${p.ref || 'Probe ' + p.nr}) wurden keine WHO-Fasern nachgewiesen.`];
    bf.push({ t: 'p', runs: [...txt, ' Der Prüfbericht weist einen Kanzerogenitätsindex von KI = ', L(p.ki, 'KI-Wert'), ' aus.'] });
  });

  /* 4. Schlussfolgerungen */
  const sf = [];
  const mat = p => ['„', L(p.material, 'Material'), `“ (${p.ref || 'Probe ' + p.nr})`];
  if (pos.length === 0 && n) {
    if (!unklar.length) sf.push({ t: 'p', runs: ['Bei ', eine ? 'dem untersuchten Material handelt es sich nicht um ein asbesthaltiges Material.' : 'den untersuchten Materialien handelt es sich nicht um asbesthaltige Materialien.'] });
  } else if (pos.length) {
    const r = pos.length === 1 ? ['Bei dem Material ', ...mat(pos[0]), ' handelt es sich um ein asbesthaltiges Material. ']
      : ['Bei den Materialien ', ...pos.flatMap((p, i) => [...(i ? [i === pos.length - 1 ? ' und ' : ', '] : []), ...mat(p)]), ' handelt es sich um asbesthaltige Materialien. '];
    r.push(`Bei allen Tätigkeiten, bei denen ${pos.length === 1 ? 'dieses Material' : 'diese Materialien'} bearbeitet, beschädigt oder entfernt ${pos.length === 1 ? 'wird' : 'werden'}, `,
      'sind die Gefahrstoffverordnung (GefStoffV) und die TRGS 519 „Asbest: Abbruch-, Sanierungs- oder Instandhaltungsarbeiten“ einzuhalten. ',
      'Die Arbeiten dürfen nur von Fachbetrieben mit der erforderlichen Sachkunde ausgeführt werden.');
    sf.push({ t: 'p', runs: r });
    if (neg.length) sf.push({ t: 'p', runs: [neg.length === 1 ? 'Bei dem übrigen untersuchten Material handelt es sich nicht um ein asbesthaltiges Material.'
      : 'Bei den übrigen untersuchten Materialien handelt es sich nicht um asbesthaltige Materialien.'] });
  }
  if (unklar.length) sf.push({ t: 'p', runs: [{ gap: '[Schlussfolgerung für nicht eindeutige Ergebnisse ergänzen]' }] });
  const kmfMitWho = kmfProben.filter(p => p.whoNachgewiesen);
  if (kmfMitWho.length) {
    sf.push({ t: 'p', runs: ['Nach der seit 05.06.2026 geltenden Fassung der TRGS 905 werden WHO-Fasern nicht mehr über den Kanzerogenitätsindex, ',
      'sondern nach den Kategorien für krebserzeugende Stoffe in Anhang I der CLP-Verordnung bewertet. Der KI-Wert wird daher nur ergänzend angegeben. ',
      'Maßgeblich für den Umgang mit dem Dämmstoff ist die TRGS 521 „Tätigkeiten mit alter Mineralwolle“.'] });
    if (f.einbau === 'vor1996') sf.push({ t: 'p', runs: ['Der Dämmstoff wurde vor 1996 eingebaut und ist nach TRGS 521 als alte Mineralwolle anzusehen. ',
      'Bei Ausbau, Demontage und Instandhaltung sind die Schutzmaßnahmen der TRGS 521 „Tätigkeiten mit alter Mineralwolle“ einzuhalten.'] });
    else sf.push({ t: 'p', runs: ['Das Einbaujahr des Dämmstoffs ist nicht bekannt. Solange nicht belegt ist, dass es sich um neue Mineralwolle handelt, ',
      'ist er wie alte Mineralwolle im Sinne der TRGS 521 zu behandeln. Bei Ausbau, Demontage und Instandhaltung sind die Schutzmaßnahmen der TRGS 521 einzuhalten.'] });
  }

  /* Unterschriften und Anlagen */
  const unterschriften = [];
  if (sv) unterschriften.push({ kuerzel: sv.kuerzel, rolle: rollentext(sv), name: sv.name });
  else unterschriften.push({ kuerzel: '', rolle: 'Sachverständige(r)', name: { gap: '[Sachverständige(r)]' } });
  if (mt && (!sv || mt.kuerzel !== sv.kuerzel)) unterschriften.push({ kuerzel: mt.kuerzel, rolle: rollentext(mt), name: mt.name });
  if (sv && pn && sv.kuerzel === pn.kuerzel && !((e.cfg && e.cfg.personen) || {})[sv.kuerzel] && !zugestellt)
    hinweise.push(`${sv.name} hat die Proben genommen und unterschreibt als Sachverständige(r) – Rolle in den Einstellungen noch nicht festgelegt (Messtechniker?).`);
  if (sv && sv.rolle === 'mt') hinweise.push(`${sv.name} ist in den Einstellungen als Messtechniker eingetragen, unterschreibt hier aber als Sachverständige(r).`);
  [sv, pn, mt].filter((p, i, xs) => p && xs.findIndex(q => q && q.kuerzel === p.kuerzel) === i).forEach(p => { if (!p.geschlecht) hinweise.push(`${p.name}: in den Einstellungen fehlt Frau/Herr.`); });
  // Anlagen: „Anlage n:“ | Prüfbericht Nr. … / (Labor) – zweizeilig mit hängendem Einzug; anlagen = dieselben Angaben als Fließtext
  const anlagenTeile = (berichtNr.length ? berichtNr : ['']).map((nr, i) =>
    ({ label: `Anlage ${i + 1}:`, zeilen: [['Prüfbericht Nr. ', L(nr, 'Prüfbericht-Nr.')], ['(', L(labor, 'Labor'), ')']] }));
  const anlagen = anlagenTeile.map(a => [a.label + ' ', ...a.zeilen[0], ' ', ...a.zeilen[1]]);
  // Prüfbericht-PDFs für die Übergabe ans Büro (liegen immer sichtbar in „Laborergebnisse“)
  const ergBerichte = e.erg && Array.isArray(e.erg.berichte) ? e.erg.berichte : [], anlagenDateien = [];
  berichtNr.forEach(nr => {
    const b = ergBerichte.find(x => s(x.bericht) === nr), pdf = b && b.sources && s(b.sources.pdf);
    if (pdf) anlagenDateien.push('Laborergebnisse/' + pdf); else hinweise.push(`Prüfbericht ${nr}: PDF nicht in „Laborergebnisse“ – für die Anlage bitte ablegen.`);
  });
  const kennzeilen = proben.some(p => p.vorlaeufig) ? [{ art: 'vorlaeufig', text: 'Vorläufig – beruht auf einem vorläufigen Prüfbericht' }] : [];

  const abschnitte = [
    { titel: '1. Veranlassung', inhalt: v },
    { titel: '2. Probenahme und Untersuchung', inhalt: pr },
    { titel: '3. Befund', inhalt: bf },
    { titel: '4. Schlussfolgerungen', inhalt: sf },
  ];
  const modell = {
    dateiname: `${+f.mitteilung || 1}._Mitteilung_${P.nr || 'Projekt'}.docx`,
    deckblatt: { titel: `Untersuchungsbericht vom ${datum}`, mitteilung, projektnummer: P.nr, betreff: betreffRuns, felder },
    kopf, kennzeilen, abschnitte, ortDatum: `Würselen, ${datum}`, unterschriften, anlagen, anlagenTeile, anlagenDateien, proben, offen,
    hinweise: [...new Set(hinweise)], sperren, probenehmerQuelle,
  };
  modell.luecken = luecken(modell);
  return modell;
}
/** Probenehmer: Es zählt nur ein genauer Treffer aus dem Feldbogen (LabelKit schlägt die Namen der Mitarbeiterliste vor) oder die
    eigene Auswahl. Alles andere – meist der Zuständige laut Ordnername – ist eine Annahme und wird angezeigt. */
function pnQuelle(f, fb, zugestellt, pn, zustaendig) {
  if (zugestellt || !pn) return null;
  const text = s(fb && fb.text), k = s(fb && fb.kuerzel), gewaehlt = s(f.probenehmer);
  if (k && k === gewaehlt) return { angenommen: false, text: `aus dem Feldbogen (LabelKit): „${text}“` };
  if (f.pnQuelle === 'hand') return { angenommen: false, text: 'eigene Auswahl' + (text ? ` – Feldbogen: „${text}“` : '') };
  const grund = k ? `Feldbogen nennt „${text}“` : text ? `Feldbogen „${text}“ passt zu keinem Namen der Mitarbeiterliste`
    : 'kein Probenehmer im Feldbogen';
  return { angenommen: true, text: `Probenehmer ${pn.name} angenommen (${gewaehlt === zustaendig ? 'zuständig laut Ordner' : 'nicht aus dem Feldbogen'}; ${grund}) – bitte prüfen.` };
}
/** Fassung zum Herunterladen, wenn das Speichern gesperrt ist: Kopfzeile „ENTWURF“ und „_ENTWURF“ im Dateinamen. */
function alsEntwurf(m) {
  return { ...m, dateiname: m.dateiname.replace(/\.docx$/i, '_ENTWURF.docx'), kennzeilen: [{ art: 'entwurf', text: 'ENTWURF – nicht versenden' }, ...(m.kennzeilen || [])] };
}
/** Alle offenen Lücken im Modell (für die Hinweisliste) */
function luecken(m) {
  const out = new Set();
  const lauf = x => { if (!x) return; if (Array.isArray(x)) x.forEach(lauf); else if (typeof x === 'object') { if (x.gap) out.add(x.gap); else Object.values(x).forEach(lauf); } };
  lauf([m.deckblatt, m.kopf, m.abschnitte, m.unterschriften, m.anlagen]);
  return [...out];
}
/** Runs → reiner Text (Lücken in eckigen Klammern) */
const text = runs => (Array.isArray(runs) ? runs : [runs]).map(r => (r && typeof r === 'object' ? r.gap : String(r == null ? '' : r))).join('');

const API = { VERSION: 1, bericht, alsEntwurf, beschreibungKey, beschreibungWeichtAb, asbestBefund, kmfWerte, person, rollentext, namensteile, datumDE, zeilen, liste, zahlwort, probenSammeln, projektSicht, text, mitArtikel, objektImSatz };
if (typeof module === 'object' && module.exports) module.exports = API;
root.BerichtText = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
