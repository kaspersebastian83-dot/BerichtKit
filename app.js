/* BerichtKit – Asbest-Untersuchungsbericht (Word) aus den Spektron-Projektdaten.
   Liest nur: _Projekt.json (Projektzentrale), *_Daten.json (LabelKit), _Ergebnisse.json (ResultKit), _Bildumbenenner.json + Fotos (FotoKit).
   Schreibt nur: die Word-Datei in „Mitteilungen“ und – über „Einstellungen“ – _Spektron-BerichtKit.json im Archivordner.
   Laborwerte und Probenbezeichnungen werden nie bearbeitet; fehlende Angaben erscheinen im Bericht gelb markiert. */
'use strict';
const APP_VERSION = '1.1.0';
const APP_DATE = '30.10.2026';
const CHANGELOG = [
  ['1.1.0', '30.10.2026', 'Teil der Spektron-Suite: Spektron-Leiste oben (Projekt, Arbeitsschritte, Weiter), Knopf „📘 Handbuch“ (AidKit-Kapitel „BerichtKit Schritt für Schritt“), Angaben zum Bericht gemeinsam für alle im Projektordner („_Spektron/BerichtKit/_BerichtKit.json“, ältere Projekte „Mitteilungen“), offline nutzbar.'],
  ['1.0.0', '30.10.2026', 'Erste Fassung: Asbest-Untersuchungsbericht (Mitteilung) aus Projektzentrale, LabelKit, ResultKit und FotoKit – Vorschau, Lücken gelb, Word-Datei in „Mitteilungen“.'],
];
const SO = globalThis.SpektronOrdner, T = globalThis.BerichtText;
const CFG_DATEI = '_Spektron-BerichtKit.json', MA_DATEI = '_Spektron-Mitarbeiter.json', SIG_ORDNER = '_Spektron-Unterschriften';
const $ = id => document.getElementById(id);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- gemeinsamer Speicher der Suite (wie Projektzentrale): DB „mosaik-suite“, Schlüssel „archiv“ ---------- */
const SUITE = {
  db: null,
  open() {
    return this.db || (this.db = new Promise((res, rej) => {
      const r = indexedDB.open('mosaik-suite', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
  },
  async get(k) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
};
/* ---------- Projektübergabe: #projekt=<Ordnername> (wie ResultKit/FotoKit) ---------- */
const PROJEKT_URL = {
  lesen: () => new URLSearchParams(location.hash.slice(1)).get('projekt') ?? new URLSearchParams(location.search).get('projekt'),
  setzen(name) {
    const url = new URL(location.href);
    const teile = url.hash.slice(1).split('&').filter(t => t && !new URLSearchParams(t).has('projekt'));
    if (name) teile.push('projekt=' + encodeURIComponent(name));
    url.searchParams.delete('projekt'); url.hash = teile.join('&');
    if (url.href !== location.href) try { history.replaceState(history.state, '', url); } catch (e) { /* file:// */ }
  },
};

const S = { archiv: null, archivOk: false, dir: null, ordner: null, pj: null, lk: null, erg: null, fk: null, fotosDir: null,
  mitarbeiter: [], cfg: { personen: {} }, cfgText: null, cfgOrt: 'archiv', sig: {}, form: {}, fotoListe: {}, quellen: [], thumbs: {}, logo: null, laedt: false };

/* ---------- Dateien ---------- */
async function leseJson(dir, name) {
  let fh; try { fh = await dir.getFileHandle(name); } catch (e) { if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') return null; throw e; }
  const file = await fh.getFile(), text = await file.text();
  try { return { data: JSON.parse(text), text, file }; } catch (e) { throw new Error(`${name} ist keine lesbare JSON-Datei.`); }
}
async function erlaubt(h, fragen) {
  const o = { mode: 'readwrite' };
  try { if (await h.queryPermission(o) === 'granted') return true; return fragen ? (await h.requestPermission(o)) === 'granted' : false; } catch (e) { return false; }
}
const heute = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/* ---------- Start ---------- */
async function start() {
  $('version').textContent = 'v' + APP_VERSION;
  if (!start.einmal) {
    start.einmal = true;
    if (window.MosaikLeiste) MosaikLeiste.start('bericht', { version: APP_VERSION });
    // offline nutzbar wie die Projektzentrale; nicht beim lokalen Testserver (127.0.0.1), damit Tests immer die aktuelle Fassung laden
    if (/^https?:$/.test(location.protocol) && location.hostname !== '127.0.0.1' && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  $('version').title = CHANGELOG.map(c => `${c[0]} (${c[1]}): ${c[2]}`).join('\n');
  document.title = `BerichtKit ${APP_VERSION} · Spektron`;
  if (!('showDirectoryPicker' in window)) { zeigeStart('BerichtKit braucht Edge oder Chrome (Zugriff auf Ordner).', false); $('btnWaehlen').disabled = true; return; }
  S.archiv = await SUITE.get('archiv').catch(() => null) || null;
  const name = PROJEKT_URL.lesen();
  if (name && S.archiv) {
    if (await erlaubt(S.archiv, false)) return projektAusArchiv(name);
    zeigeStart(`Für „${name}“ braucht BerichtKit Zugriff auf den Archivordner.`, true);
    $('btnZugriff').onclick = async () => { if (await erlaubt(S.archiv, true)) projektAusArchiv(name); };
    return;
  }
  zeigeStart(name ? 'Archivordner unbekannt – bitte einmal die Projektzentrale öffnen oder den Projektordner wählen.' : null, false);
}
function zeigeStart(text, zugriff) {
  $('start').hidden = false; $('app').hidden = true; $('leiste').hidden = true;
  if (text) $('startText').textContent = text;
  $('btnZugriff').hidden = !zugriff;
}
async function projektAusArchiv(name) {
  let dir = null;
  try { dir = await S.archiv.getDirectoryHandle(name); } catch (e) { zeigeStart(`Projektordner „${name}“ nicht im Archivordner gefunden.`, false); return; }
  S.archivOk = true;
  await oeffnen(dir);
}
async function waehlen() {
  let dir;
  try { dir = await window.showDirectoryPicker({ mode: 'readwrite', id: 'berichtkit-projekt', startIn: S.archiv || undefined }); } catch (e) { return; }
  S.archivOk = false;
  if (S.archiv && await erlaubt(S.archiv, false)) {
    const pfad = await S.archiv.resolve(dir).catch(() => null);
    if (pfad && pfad.length) { S.archivOk = true; if (pfad.length > 1) dir = await S.archiv.getDirectoryHandle(pfad[0]); }
    else if (await dir.isSameEntry(S.archiv)) { alert('Das ist der Archivordner – bitte einen Projektordner darin wählen.'); return; }
  }
  PROJEKT_URL.setzen(dir.name);
  await oeffnen(dir);
}

/* ---------- Projekt lesen ---------- */
async function oeffnen(dir) {
  S.laedt = true;
  S.dir = dir; $('kopfProjekt').textContent = dir.name; $('kopfProjekt').title = dir.name;
  $('start').hidden = true; $('app').hidden = false; $('leiste').hidden = false;
  fehler('');
  const nr = (/^(\d{2})\.(\d{4})/.exec(dir.name) || []).slice(1).join('.');
  S.ordner = { name: dir.name, nr, kuerzel: '' };
  S.quellen = []; S.thumbs = {};
  const q = (ok, text) => S.quellen.push({ ok, text });
  try {
    await archivLesen();
    // Projektdaten (Projektzentrale)
    S.pj = null;
    const op = await SO.ort(dir, 'projekt');
    const rp = op.dir ? await leseJson(op.dir, '_Projekt.json') : null;
    if (rp && rp.data && rp.data.format === 'mosaik-projekt') { S.pj = rp.data; q(true, 'Projektdaten aus der Projektzentrale'); }
    else q(false, 'Keine Projektdaten (_Projekt.json) – in der Projektzentrale Objekt, Auftraggeber usw. eintragen.');
    S.ordner.kuerzel = ordnerKuerzel(dir.name);
    // LabelKit: neueste *_Daten.json
    S.lk = null;
    const ol = await SO.ort(dir, 'labelkit');
    if (ol.dir) {
      let neu = null;
      for await (const h of ol.dir.values()) if (h.kind === 'file' && /_Daten\.json$/i.test(h.name)) { const f = await h.getFile(); if (!neu || f.lastModified > neu.lastModified) neu = f; }
      if (neu) { try { S.lk = JSON.parse(await neu.text()); q(true, `LabelKit: ${neu.name}`); } catch (e) { q(false, `LabelKit-Datei ${neu.name} nicht lesbar.`); } }
    }
    if (!S.lk) q(false, 'Keine LabelKit-Daten – Material und Entnahmestelle fehlen dann.');
    else if (S.lk.projekt && S.lk.projekt.nr && nr && S.lk.projekt.nr !== nr) q(false, `LabelKit-Datei gehört zu Projekt ${S.lk.projekt.nr}, nicht zu ${nr}.`);
    // ResultKit
    S.erg = null;
    const or = await SO.ort(dir, 'resultkit');
    const re = or.dir ? await leseJson(or.dir, '_Ergebnisse.json') : null;
    if (re && re.data && re.data.format === 'spektron-ergebnisse' && re.data.version === 1 && Array.isArray(re.data.berichte)) {
      S.erg = re.data; const am = T.datumDE(String(re.data.uebernommen || '').slice(0, 10)); q(true, 'Laborergebnisse aus ResultKit' + (am ? ` (übernommen ${am})` : ''));
      if (re.data.vollstaendig === false) q(false, 'ResultKit: noch nicht alle Ergebnisse da.');
    } else q(false, 'Keine Laborergebnisse – zuerst in ResultKit die Prüfberichte übernehmen.');
    // FotoKit
    S.fk = null; S.fotosDir = await SO.unter(dir, ['Fotos']).catch(() => null);
    const of = await SO.ort(dir, 'fotokit');
    const rf = of.dir ? await leseJson(of.dir, '_Bildumbenenner.json').catch(() => null) : null;
    if (rf && rf.data) { S.fk = rf.data; q(true, 'Fotos mit Probennummer aus FotoKit'); } else q(false, 'Keine FotoKit-Daten – der Bericht kommt ohne Fotos.');
    fotoListeBauen();
    await formStart();
  } catch (e) {
    fehler('Projekt konnte nicht gelesen werden: ' + (e && e.message || e));
  }
  S.laedt = false;
  render();
  if (window.MosaikLeiste) MosaikLeiste.aktualisieren();
}
async function archivLesen() {
  S.mitarbeiter = []; S.cfg = { personen: {} }; S.cfgText = null; S.sig = {};
  if (S.archivOk && S.archiv) {
    const ma = await leseJson(S.archiv, MA_DATEI).catch(() => null);
    if (ma && ma.data && ma.data.format === 'spektron-mitarbeiter' && Array.isArray(ma.data.personen)) S.mitarbeiter = ma.data.personen.filter(p => p && p.ordnerKuerzel && p.aktiv !== false);
    const c = await leseJson(S.archiv, CFG_DATEI).catch(e => { fehler(e.message); return null; });
    if (c && c.data && c.data.format === 'spektron-berichtkit') S.cfg = { personen: {}, ...c.data };
    S.cfgText = c ? c.text : null; S.cfgOrt = 'archiv';
    const sd = await SO.unter(S.archiv, [SIG_ORDNER]).catch(() => null);
    if (sd) for await (const h of sd.values()) {
      if (h.kind !== 'file' || !/\.png$/i.test(h.name)) continue;
      try {
        const f = await h.getFile(), data = new Uint8Array(await f.arrayBuffer()), bmp = await createImageBitmap(f);
        S.sig[h.name.replace(/\.png$/i, '').toLowerCase()] = { data, w: bmp.width, h: bmp.height, url: URL.createObjectURL(f) }; bmp.close();
      } catch (e) { /* unlesbares Bild: ohne Unterschrift */ }
    }
  } else {
    S.cfgOrt = 'lokal';
    try { const c = JSON.parse(localStorage.getItem('berichtkit:cfg') || 'null'); if (c && c.format === 'spektron-berichtkit') S.cfg = { personen: {}, ...c }; } catch (e) { /* leer */ }
  }
}
function ordnerKuerzel(name) {
  const rest = name.replace(/^\d{2}\.\d{4}\s*/, '').normalize('NFC');
  const norm = v => String(v || '').toLowerCase().replace(/[\s.]/g, '');
  const w = rest.split(/[\s_]+/).filter(Boolean);
  for (let n = Math.min(3, w.length); n >= 1; n--) {
    const ende = norm(w.slice(-n).join(''));
    const p = S.mitarbeiter.find(x => norm(x.ordnerKuerzel) === ende); if (p) return p.ordnerKuerzel;
  }
  return '';
}
function fotoListeBauen() {
  S.fotoListe = {};
  const b = S.fk && S.fk.bilder; if (!b) return;
  const reihe = [...(Array.isArray(S.fk.reihenfolge) ? S.fk.reihenfolge : []), ...Object.keys(b)].filter((x, i, a) => a.indexOf(x) === i && b[x]);
  for (const datei of reihe) {
    const v = b[datei]; if (!v || v.aussortiert || !v.probe) continue;
    for (const teil of String(v.probe).split(/[,;/+]/)) {
      const m = /^\s*(?:P|Probe)\s*0*(\d+)\s*$/i.exec(teil); if (!m) continue;
      (S.fotoListe['P' + m[1]] = S.fotoListe['P' + m[1]] || []).push({ datei, beschreibung: v.beschreibung || '', drehung: +v.drehung || 0 });
    }
  }
}
function personFinden(text) {
  const t = String(text || '').trim().toLowerCase(); if (!t) return '';
  const p = S.mitarbeiter.find(x => [x.ordnerKuerzel, x.appKuerzel, x.name].some(v => String(v || '').trim().toLowerCase() === t))
    || S.mitarbeiter.find(x => x.name && x.name.toLowerCase().includes(t));
  return p ? p.ordnerKuerzel : '';
}
const rolle = k => ((S.cfg.personen || {})[k] || {}).rolle === 'mt' ? 'mt' : 'sv';
async function naechsteMitteilung() {
  const m = await SO.unter(S.dir, ['Mitteilungen']).catch(() => null); let max = 0;
  if (m) for await (const h of m.values()) { const x = /^(\d+)\.[\s_]*Mitteilung/i.exec(h.name); if (x) max = Math.max(max, +x[1]); }
  return max + 1;
}
async function formStart() {
  const key = 'berichtkit:form:' + (S.ordner.nr || S.ordner.name);
  let gespeichert = {}; try { gespeichert = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { /* leer */ }
  const P = T.projektSicht(S.pj, S.ordner);
  const fp = ((S.lk && S.lk.feldprotokolle) || []).find(x => x && x.typ === 'asbestmat' && x.kopf && x.kopf.probenehmer);
  const pn = personFinden(fp && fp.kopf.probenehmer) || P.zustaendig;
  const svListe = S.mitarbeiter.filter(p => rolle(p.ordnerKuerzel) === 'sv');
  const sv = P.zustaendig && rolle(P.zustaendig) === 'sv' ? P.zustaendig : (svListe[0] && svListe[0].ordnerKuerzel) || '';
  const vorgabe = { datum: heute(), mitteilung: await naechsteMitteilung(), variante: 'eigen', eingangsdatum: '', auftragsdatum: P.auftragsdatum,
    agSatz: T.zeilen(P.ag)[0] || '', probenehmer: pn, sv, mt: pn && rolle(pn) === 'mt' ? pn : '', labor: S.cfg.labor || '', einbau: 'unbekannt',
    aus: {}, kmf: {}, who: {}, ki: {}, foto: {} };
  S.formKey = key; S.zustand = { text: null, geplant: 0, warte: null, berichte: [] };
  const geteilt = await zustandLesen().catch(e => { S.quellen.push({ ok: false, text: 'Angaben zum Bericht nicht lesbar: ' + (e && e.message || e) }); return null; });
  if (geteilt) S.quellen.push({ ok: true, text: 'Angaben zum Bericht aus dem Projektordner' + (geteilt.von ? ` (zuletzt ${geteilt.von})` : '') });
  S.form = { ...vorgabe, ...(geteilt ? geteilt.form : gespeichert) };
  if (!geteilt && Object.keys(gespeichert).length) zustandPlanen();   // frühere Angaben aus diesem Browser einmal in den Projektordner übernehmen
}
/* ---------- Angaben zum Bericht – gemeinsam im Projektordner (Bereich „berichtkit“ in spektron-ordner.js) ----------
   { format:'spektron-bericht', version:1, projekt, form:{…}, berichte:[{datei, am, von}], geaendert, geaendertVon, geaendertMit }
   Frisch lesen → nur schreiben, wenn die Datei seit dem letzten Lesen/Schreiben unverändert ist → zurücklesen.
   Hat ein Kollege inzwischen gespeichert, gilt sein Stand (wird geladen und gemeldet) – nichts wird stumm überschrieben. */
const ZUSTAND_DATEI = '_BerichtKit.json';
const ich = () => { try { return (localStorage.getItem('spektron-ich') || '').trim(); } catch (e) { return ''; } };
function zustandAus(text) {
  const d = JSON.parse(text);
  if (!d || d.format !== 'spektron-bericht' || d.version !== 1 || typeof d.form !== 'object') throw new Error(`${ZUSTAND_DATEI} hat ein unbekanntes Format.`);
  return d;
}
async function zustandLesen() {
  const o = await SO.ort(S.dir, 'berichtkit');
  if (!o.dir) return null;
  const r = await leseJson(o.dir, ZUSTAND_DATEI); if (!r) return null;
  const d = zustandAus(r.text); S.zustand.text = r.text; S.zustand.berichte = Array.isArray(d.berichte) ? d.berichte : [];
  return { form: d.form, von: d.geaendertVon || '' };
}
function formMerken() { try { localStorage.setItem(S.formKey, JSON.stringify(S.form)); } catch (e) { /* voll/gesperrt */ } zustandPlanen(); }
function zustandPlanen() { clearTimeout(S.zustand.geplant); S.zustand.geplant = setTimeout(() => zustandSchreiben().catch(e => fehler('Angaben zum Bericht nicht gespeichert: ' + (e && e.message || e))), 900); }
async function zustandSchreiben(bericht) {
  const dir = S.dir; if (!dir) return;
  const lauf = async () => {
    const o = await SO.ort(dir, 'berichtkit', { anlegen: true });
    if (!o.dir) throw new Error('Ablageort nicht verfügbar.');
    const jetzt = await leseJson(o.dir, ZUSTAND_DATEI).catch(() => null);
    if (jetzt && jetzt.text !== S.zustand.text) {   // ein Kollege war schneller: sein Stand gilt
      const d = zustandAus(jetzt.text); S.zustand.text = jetzt.text; S.zustand.berichte = Array.isArray(d.berichte) ? d.berichte : [];
      S.form = { ...S.form, ...d.form }; formLokal();
      $('status').textContent = `Angaben zum Bericht wurden inzwischen ${d.geaendertVon ? 'von ' + d.geaendertVon + ' ' : ''}geändert – dieser Stand ist jetzt geladen.`;
      render(); if (!bericht) return;
    }
    if (bericht) S.zustand.berichte = [...S.zustand.berichte, bericht].slice(-50);
    const daten = { format: 'spektron-bericht', version: 1, hinweis: 'Angaben von BerichtKit zum Bericht dieses Projekts – nicht von Hand bearbeiten.',
      projekt: S.ordner.nr || '', form: S.form, berichte: S.zustand.berichte, geaendert: new Date().toISOString(), geaendertVon: ich(), geaendertMit: 'BerichtKit ' + APP_VERSION };
    const text = JSON.stringify(daten, null, 1);
    const fh = await o.dir.getFileHandle(ZUSTAND_DATEI, { create: true }), w = await fh.createWritable(); await w.write(text); await w.close();
    if (await (await fh.getFile()).text() !== text) throw new Error('Zurücklesen stimmt nicht.');
    S.zustand.text = text;
  };
  return navigator.locks ? navigator.locks.request('berichtkit:projekt:' + dir.name, lauf) : lauf();
}
function formLokal() { try { localStorage.setItem(S.formKey, JSON.stringify(S.form)); } catch (e) { /* voll/gesperrt */ } }

/* ---------- Modell ---------- */
function modell() {
  return T.bericht({ pj: S.pj, ordner: S.ordner, lk: S.lk, erg: S.erg, cfg: S.cfg, mitarbeiter: S.mitarbeiter, fotos: S.fotoListe, form: S.form });
}

/* ---------- Anzeige ---------- */
function fehler(text) { $('fehler').hidden = !text; $('fehler').textContent = text || ''; }
function optionen(sel, wert, leer, filter) {
  const liste = S.mitarbeiter.length ? S.mitarbeiter : Object.keys(S.cfg.personen || {}).map(k => ({ ordnerKuerzel: k, name: (S.cfg.personen[k] || {}).name || k }));
  sel.innerHTML = `<option value="">${esc(leer)}</option>` + liste.filter(p => !filter || filter(p.ordnerKuerzel) || p.ordnerKuerzel === wert)
    .map(p => `<option value="${esc(p.ordnerKuerzel)}">${esc(((S.cfg.personen || {})[p.ordnerKuerzel] || {}).name || p.name || p.ordnerKuerzel)} (${esc(p.ordnerKuerzel)})</option>`).join('');
  if (wert && ![...sel.options].some(o => o.value === wert)) sel.insertAdjacentHTML('beforeend', `<option value="${esc(wert)}">${esc(wert)}</option>`);
  sel.value = wert || '';
}
function render() {
  if (S.laedt || !S.dir) return;
  const f = S.form, m = modell(), P = T.projektSicht(S.pj, S.ordner);
  $('fDatum').value = f.datum || ''; $('fMitteilung').value = f.mitteilung || 1;
  document.querySelectorAll('input[name=variante]').forEach(r => { r.checked = r.value === (f.variante || 'eigen'); });
  const zug = f.variante === 'zugestellt';
  $('zeileEingang').hidden = !zug; $('fEingang').value = f.eingangsdatum || '';
  $('fAuftrag').value = f.auftragsdatum || ''; $('fAuftrag').closest('.feld').hidden = zug;
  $('qAuftrag').textContent = P.auftragsdatum ? (f.auftragsdatum === P.auftragsdatum ? 'aus der Projektzentrale' : `Projektzentrale: ${T.datumDE(P.auftragsdatum)}`) : 'in der Projektzentrale nicht eingetragen';
  $('fAg').value = f.agSatz || '';
  $('agInfo').textContent = P.versicherungsfall ? 'Versicherungsfall: Deckblatt mit VN, Risiko, Versicherer und Schaden-Nr.' : 'Direkter Auftrag: Deckblatt mit Auftraggeber, Schadenort und Schaden-Nr.';
  optionen($('fPn'), f.probenehmer, '– bitte wählen –'); $('zeilePn').hidden = zug;
  optionen($('fSv'), f.sv, '– bitte wählen –', k => rolle(k) === 'sv');
  optionen($('fMt'), f.mt, 'keine'); $('zeileMt').hidden = zug;
  $('fLabor').value = f.labor || '';
  // Proben
  const alle = T.probenSammeln(S.erg, S.lk).proben, imBericht = new Map(m.proben.map(p => [p.label, p]));
  $('probenInfo').textContent = alle.length ? `${m.proben.length} von ${alle.length} im Bericht` : '';
  $('probenListe').innerHTML = alle.length ? alle.map(p => {
    const b = imBericht.get(p.label), an = !!b, x = b || p;
    const bef = p.befund ? `<span class="befund ${p.befund.gefunden ? 'pos' : p.befund.eindeutig ? 'neg' : 'unk'}">${esc(p.befund.text)}</span>` : '<span class="befund unk">–</span>';
    const fotos = S.fotoListe[p.label] || [];
    const kmf = b ? b.istKmf : false;
    let unter = '';
    if (an) {
      unter += `<label title="Dämmstoff / künstliche Mineralfasern"><input type="checkbox" data-art="kmf" data-l="${esc(p.label)}" ${kmf ? 'checked' : ''}> KMF</label>`;
      if (kmf) {
        unter += `<label><input type="checkbox" data-art="who" data-l="${esc(p.label)}" ${b.whoNachgewiesen ? 'checked' : ''}> WHO-Fasern nachgewiesen</label>`;
        unter += p.kmf.ki ? `<span>KI = ${esc(p.kmf.ki)} <span class="klein">(Labor)</span></span>`
          : `<label>KI <input type="text" data-art="ki" data-l="${esc(p.label)}" value="${esc((f.ki || {})[p.label] || '')}" placeholder="aus PDF" title="Steht nicht in den Labordaten – genau wie im Prüfbericht eintragen"></label>`;
      }
      unter += `<label>Foto <select data-art="foto" data-l="${esc(p.label)}"><option value="">kein Foto</option>${fotos.map(o => `<option value="${esc(o.datei)}" ${o.datei === b.foto ? 'selected' : ''}>${esc(o.datei)}</option>`).join('')}</select></label>`;
    }
    return `<tr class="${an ? '' : 'aus'}"><td><input type="checkbox" data-art="aus" data-l="${esc(p.label)}" ${an ? 'checked' : ''} title="Im Bericht"></td>
      <td style="white-space:nowrap">${esc(p.ref || p.label)}<div class="klein" style="font-size:10.5px">${esc(p.labNr)}</div></td>
      <td>${x.material ? esc(x.material) : '<span class="befund unk">Material fehlt</span>'}<div class="klein">${esc(x.stelle)}</div>${unter ? `<div class="unter">${unter}</div>` : ''}</td>
      <td>${bef}</td></tr>`;
  }).join('') : '<tr><td colspan="4" class="klein">Keine Asbestergebnisse gefunden.</td></tr>';
  $('einbauWahl').hidden = !m.proben.some(p => p.istKmf && p.whoNachgewiesen);
  document.querySelectorAll('input[name=einbau]').forEach(r => { r.checked = r.value === (f.einbau || 'unbekannt'); });
  // Hinweise
  $('hinweise').innerHTML = [
    ...m.luecken.map(l => `<li class="luecke">Lücke im Bericht: ${esc(l)}</li>`),
    ...m.hinweise.map(h => `<li>${esc(h)}</li>`),
    ...S.quellen.map(q => `<li class="${q.ok ? 'ok' : ''}">${q.ok ? '✓ ' : ''}${esc(q.text)}</li>`),
    ...(S.cfgOrt === 'lokal' ? ['<li>Archivordner nicht verbunden: Einstellungen gelten nur in diesem Browser.</li>'] : []),
  ].join('');
  vorschau(m);
  $('status').textContent = `Speichert als Mitteilungen/${m.dateiname}` + (m.luecken.length ? ` · ${m.luecken.length} Lücke(n) gelb markiert` : '');
}
function runsHtml(r) { return (Array.isArray(r) ? r : [r]).map(x => x && typeof x === 'object' ? `<span class="gap">${esc(x.gap)}</span>` : esc(x)).join(''); }
function vorschau(m) {
  const d = m.deckblatt;
  const deck = `<div class="blatt"><p class="titel">${esc(d.titel)}</p><p class="mitt">(${esc(d.mitteilung)})</p>
    <div class="zeile"><span>Projektnummer:</span><span>${runsHtml(d.projektnummer || { gap: '[Projektnummer]' })}</span></div>
    <p style="margin:0 0 12px;text-align:left;line-height:1.35">${runsHtml(d.betreff)}</p>
    ${d.felder.map(([k, v]) => `<div class="zeile"><span>${esc(k)}</span><span>${v.map(runsHtml).join('<br>')}</span></div>`).join('')}</div>`;
  const teile = [`<div class="kopfzeilen">${m.kopf.map(runsHtml).join('<br>')}</div>`];
  for (const a of m.abschnitte) {
    teile.push(`<h3>${esc(a.titel)}</h3>`);
    for (const x of a.inhalt) {
      if (x.t === 'p') teile.push(`<p>${runsHtml(x.runs)}</p>`);
      else if (x.t === 'fig') teile.push(`<figure>${S.thumbs[x.datei] ? `<img src="${S.thumbs[x.datei]}" alt="">` : `<span class="ersatz" data-thumb="${esc(x.datei)}">${esc(x.datei)}</span>`}<figcaption>${esc(x.caption)}</figcaption></figure>`);
      else if (x.t === 'tab') teile.push(`<div class="tabtitel">${esc(x.caption)}</div><table><tr>${x.kopf.map(k => `<th>${esc(k)}</th>`).join('')}</tr>${x.zeilen.map(z => `<tr>${z.map(c => `<td>${esc(c || '–')}</td>`).join('')}</tr>`).join('')}</table>`);
    }
  }
  teile.push(`<p style="margin-top:20px">${esc(m.ortDatum)}</p><div class="sig">${m.unterschriften.map(u => {
    const b = u.kuerzel && S.sig[u.kuerzel.toLowerCase()];
    return `<div><div class="linie">${b ? `<img src="${b.url}" alt="">` : ''}</div>${runsHtml(u.rolle)}<br>${runsHtml(u.name)}</div>`; }).join('')}</div>`);
  teile.push(`<p style="margin-top:28px;text-align:left">${m.anlagen.map(runsHtml).join('<br>')}</p>`);
  $('vorschau').innerHTML = deck + `<div class="blatt">${teile.join('')}</div>`;
  vorschauBilder();
}
async function vorschauBilder() {
  for (const el of document.querySelectorAll('[data-thumb]')) {
    const datei = el.dataset.thumb; if (S.thumbs[datei] === undefined) {
      S.thumbs[datei] = null;
      try { const f = await fotoBytes(datei, 480); S.thumbs[datei] = URL.createObjectURL(new Blob([f.data], { type: 'image/jpeg' })); } catch (e) { S.thumbs[datei] = ''; }
    }
    if (S.thumbs[datei]) { const img = document.createElement('img'); img.src = S.thumbs[datei]; img.alt = ''; el.replaceWith(img); }
  }
}

/* ---------- Bilder ---------- */
function drehungVon(datei) { const b = S.fk && S.fk.bilder && S.fk.bilder[datei]; return b ? +b.drehung || 0 : 0; }
async function fotoBytes(datei, max = 1600) {
  if (!S.fotosDir) throw new Error('Ordner „Fotos“ fehlt.');
  const file = await (await S.fotosDir.getFileHandle(datei)).getFile();
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const turn = ((Math.round(drehungVon(datei) / 90) % 4) + 4) % 4, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s), c = document.createElement('canvas');
    c.width = turn % 2 ? h : w; c.height = turn % 2 ? w : h;
    const ctx = c.getContext('2d'); ctx.translate(c.width / 2, c.height / 2); ctx.rotate(turn * Math.PI / 2); ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    return { data: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height };
  } finally { bmp.close(); }
}
async function logoLaden() {
  if (S.logo) return S.logo;
  const hol = async n => new Uint8Array(await (await fetch(n, { cache: 'no-cache' })).arrayBuffer());
  S.logo = { logoSvg: await hol('assets/logo-schiffers.svg'), logoPng: await hol('assets/logo-schiffers.png') };
  return S.logo;
}

/* ---------- Word-Datei ---------- */
async function wordBlob() {
  const m = modell();
  if (!m.proben.length) throw new Error('Keine Proben im Bericht.');
  const bilder = { ...(await logoLaden()), sig: {}, fotos: {} };
  for (const u of m.unterschriften) { const b = u.kuerzel && S.sig[u.kuerzel.toLowerCase()]; if (b) bilder.sig[u.kuerzel] = b; }
  const fehlen = [];
  for (const p of m.proben) if (p.foto) { try { bilder.fotos[p.label] = await fotoBytes(p.foto); } catch (e) { fehlen.push(p.foto); } }
  const blob = await docx.Packer.toBlob(BerichtDocx.erstellen(docx, m, bilder));
  return { blob, m, fehlen };
}
async function speichern() {
  const knopf = $('btnErstellen'); knopf.disabled = true; $('status').textContent = 'Word-Datei wird erstellt …';
  try {
    const { blob, m, fehlen } = await wordBlob();
    if (m.luecken.length && !confirm(`Im Bericht sind noch ${m.luecken.length} Lücke(n) gelb markiert:\n${m.luecken.join(', ')}\n\nTrotzdem speichern?`)) { render(); return; }
    if (!(await erlaubt(S.dir, true))) throw new Error('Kein Schreibzugriff auf den Projektordner.');
    const ziel = await SO.unter(S.dir, ['Mitteilungen'], true);
    let name = m.dateiname, vorhanden = false;
    try { await ziel.getFileHandle(name); vorhanden = true; } catch (e) { /* frei */ }
    if (vorhanden && !confirm(`„${name}“ gibt es schon in „Mitteilungen“.\n\nOK = überschreiben\nAbbrechen = daneben als neue Fassung „… (2)“ speichern`)) {
      for (let i = 2; ; i++) { const n = name.replace(/\.docx$/, ` (${i}).docx`); try { await ziel.getFileHandle(n); } catch (e) { name = n; break; } }
    }
    const fh = await ziel.getFileHandle(name, { create: true });
    let w; try { w = await fh.createWritable(); } catch (e) { throw new Error(`„${name}“ lässt sich nicht schreiben – ist die Datei noch in Word geöffnet?`); }
    await w.write(blob); await w.close();
    const zurueck = await (await fh.getFile()).arrayBuffer();
    if (zurueck.byteLength !== blob.size) throw new Error('Gespeicherte Datei ist unvollständig – bitte erneut versuchen.');
    clearTimeout(S.zustand.geplant);
    await zustandSchreiben({ datei: name, am: new Date().toISOString(), von: ich() }).catch(e => fehler('Bericht gespeichert, Angaben dazu nicht: ' + (e && e.message || e)));
    if (window.MosaikLeiste) MosaikLeiste.aktualisieren();
    $('status').innerHTML = `<span class="ok">✓ Gespeichert: Mitteilungen/${esc(name)}</span>` + (fehlen.length ? ` · Foto(s) nicht lesbar: ${esc(fehlen.join(', '))}` : '');
  } catch (e) {
    $('status').textContent = ''; fehler('Speichern fehlgeschlagen: ' + (e && e.message || e));
  } finally { knopf.disabled = false; }
}
async function herunterladen() {
  try {
    const { blob, m } = await wordBlob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = m.dateiname; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (e) { fehler('Erstellen fehlgeschlagen: ' + (e && e.message || e)); }
}

/* ---------- Einstellungen (Archivordner: _Spektron-BerichtKit.json) ---------- */
function einstellungenOeffnen() {
  const c = S.cfg || { personen: {} }, pers = c.personen || {};
  const liste = [...S.mitarbeiter.map(p => p.ordnerKuerzel), ...Object.keys(pers)].filter((k, i, a) => k && a.indexOf(k) === i);
  $('eLabor').value = c.labor || '';
  $('ePersonen').innerHTML = liste.length ? liste.map(k => {
    const p = pers[k] || {}, ma = S.mitarbeiter.find(x => x.ordnerKuerzel === k) || {};
    const vorschlag = T.person({ personen: { [k]: { ...p, satz: '' } } }, S.mitarbeiter, k);
    return `<tr data-k="${esc(k)}"><td>${esc(k)}</td>
      <td><input type="text" data-f="name" value="${esc(p.name || '')}" placeholder="${esc(ma.name || '')}" title="Leer = Name aus der Projektzentrale; z. B. mit akademischem Grad"></td>
      <td><select data-f="geschlecht"><option value="">–</option><option value="w" ${p.geschlecht === 'w' ? 'selected' : ''}>Frau</option><option value="m" ${p.geschlecht === 'm' ? 'selected' : ''}>Herr</option></select></td>
      <td><select data-f="rolle"><option value="sv">Sachverständige(r)</option><option value="mt" ${p.rolle === 'mt' ? 'selected' : ''}>Messtechniker(in)</option></select></td>
      <td><input type="text" data-f="satz" value="${esc(p.satz || '')}" placeholder="${esc(vorschlag ? vorschlag.satz : '')}" title="„… wurde durch ___ entnommen“ – leer = Vorschlag"></td>
      <td>${S.sig[k.toLowerCase()] ? '<span class="ok">✓ vorhanden</span>' : `<span class="klein">fehlt (${esc(k)}.png)</span>`}</td></tr>`;
  }).join('') : '<tr><td colspan="6" class="klein">Keine Namensliste – in der Projektzentrale unter Mitarbeiter anlegen.</td></tr>';
  $('eHinweis').textContent = S.cfgOrt === 'lokal' ? 'Archivordner nicht verbunden – Einstellungen werden nur in diesem Browser gespeichert. Öffnen Sie BerichtKit aus der Projektzentrale, damit sie für alle gelten.' : '';
  $('dlgEinstellungen').showModal();
}
async function einstellungenSpeichern() {
  const personen = {};
  for (const tr of $('ePersonen').querySelectorAll('tr[data-k]')) {
    const p = {}; for (const el of tr.querySelectorAll('[data-f]')) if (el.value.trim()) p[el.dataset.f] = el.value.trim();
    if (p.rolle === 'sv') delete p.rolle; if (Object.keys(p).length) personen[tr.dataset.k] = p;
  }
  const neu = { format: 'spektron-berichtkit', version: 1, hinweis: 'Einstellungen von BerichtKit (Spektron) – Namen, Rollen, Labor. Nicht von Hand bearbeiten.',
    labor: $('eLabor').value.trim(), personen, geaendert: new Date().toISOString(), geaendertMit: 'BerichtKit ' + APP_VERSION };
  const text = JSON.stringify(neu, null, 1);
  try {
    if (S.cfgOrt === 'archiv' && S.archiv) {
      if (!(await erlaubt(S.archiv, true))) throw new Error('Kein Schreibzugriff auf den Archivordner.');
      const jetzt = await leseJson(S.archiv, CFG_DATEI).catch(() => null);
      if ((jetzt ? jetzt.text : null) !== S.cfgText && !confirm('Die Einstellungen wurden inzwischen von jemand anderem geändert.\nOK = trotzdem mit Ihrer Fassung überschreiben, Abbrechen = nichts speichern.')) return;
      const fh = await S.archiv.getFileHandle(CFG_DATEI, { create: true }), w = await fh.createWritable(); await w.write(text); await w.close();
      const zurueck = await (await fh.getFile()).text(); if (zurueck !== text) throw new Error('Zurücklesen stimmt nicht.');
      S.cfgText = text;
    } else localStorage.setItem('berichtkit:cfg', text);
    const laborAlt = S.cfg.labor || '';
    S.cfg = neu; if (!S.form.labor || S.form.labor === laborAlt) S.form.labor = neu.labor;
    $('dlgEinstellungen').close(); formMerken(); render();
  } catch (e) { alert('Einstellungen nicht gespeichert: ' + (e && e.message || e)); }
}

/* ---------- Eingaben ---------- */
function setze(k, v) { S.form[k] = v; formMerken(); render(); }
function verbinden() {
  $('btnWaehlen').onclick = waehlen; $('btnOrdner').onclick = waehlen;
  $('btnEinstellungen').onclick = einstellungenOeffnen;
  $('eAbbrechen').onclick = () => $('dlgEinstellungen').close(); $('eSpeichern').onclick = einstellungenSpeichern;
  $('btnErstellen').onclick = speichern; $('btnLaden').onclick = herunterladen;
  $('fDatum').onchange = e => setze('datum', e.target.value);
  $('fMitteilung').onchange = e => setze('mitteilung', Math.max(1, +e.target.value || 1));
  $('fEingang').onchange = e => setze('eingangsdatum', e.target.value);
  $('fAuftrag').onchange = e => setze('auftragsdatum', e.target.value);
  $('fAg').oninput = e => { S.form.agSatz = e.target.value; formMerken(); vorschau(modell()); };
  $('fAg').onchange = () => render();
  $('fPn').onchange = e => { const k = e.target.value; S.form.probenehmer = k; if (k && rolle(k) === 'mt') S.form.mt = k; else if (S.form.mt && S.form.mt !== k && rolle(S.form.mt) === 'mt') S.form.mt = ''; setze('probenehmer', k); };
  $('fSv').onchange = e => setze('sv', e.target.value);
  $('fMt').onchange = e => setze('mt', e.target.value);
  $('fLabor').onchange = e => setze('labor', e.target.value.trim());
  document.querySelectorAll('input[name=variante]').forEach(r => { r.onchange = () => setze('variante', r.value); });
  document.querySelectorAll('input[name=einbau]').forEach(r => { r.onchange = () => setze('einbau', r.value); });
  $('probenListe').addEventListener('change', e => {
    const el = e.target, art = el.dataset.art, l = el.dataset.l; if (!art) return;
    const map = S.form[art] = { ...(S.form[art] || {}) };
    if (art === 'aus') { if (el.checked) delete map[l]; else map[l] = false; }
    else if (art === 'kmf' || art === 'who') map[l] = el.checked;
    else map[l] = el.value.trim();
    formMerken(); render();
  });
  window.addEventListener('hashchange', () => { const n = PROJEKT_URL.lesen(); if (n && (!S.dir || n !== S.dir.name)) start(); });
}
verbinden();
start();
