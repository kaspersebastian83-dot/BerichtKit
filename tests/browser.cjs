// BerichtKit im echten Browser (Chromium): Archiv- und Projektordner werden im privaten Dateisystem des Browsers (OPFS)
// nachgebaut – mit erfundenen Daten. Geprüft: Öffnen über #projekt=, Vorschau, Einstellungen, Word-Datei in „Mitteilungen“.
// node tests/browser.cjs [chromium]   (Playwright wird in CI installiert; lokal reicht ein vorhandenes playwright)
// Mit BERICHT_AUSGABE=<Ordner> wird die erzeugte Word-Datei dort abgelegt (zum Ansehen).
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const B = require('./daten/beispiel.cjs');
const ROOT = path.join(__dirname, '..');
const TYP = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYP[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
const PROJEKT = '99.9001 Musterweg Musterstadt Tst';
const daten = {
  pj: B.pj(),
  lk: B.lk([[1, '2026-10-16', 'Umkleide Schwimmbad', 'Fliesenkleber', 'Bituminöse Proben / Kleber'], [2, '2026-10-16', 'Dachboden', 'Dämmstoff Mineralwolle', 'Sonstige']]),
  erg: B.erg([[1, 'chrysotil'], [2, 'kmf']]),
  ma: { format: 'spektron-mitarbeiter', version: 1, personen: B.mitarbeiter },
  fk: { app: 'Bildumbenenner', format: 1, reihenfolge: ['01_P1_Fliesenkleber.jpg'], bilder: { '01_P1_Fliesenkleber.jpg': { beschreibung: 'Fliesenkleber', probe: 'P1' }, '02_alt.jpg': { aussortiert: true, probe: 'P1' } } },
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  // Archiv-Handle wie aus „mosaik-suite“/„archiv“: direkt aus dem OPFS geliefert. Ein Ordner-Handle aus IndexedDB zurückzulesen
  // bringt manche Headless-Chromium-Builds zum Absturz; die Projektzentrale legt es im echten Browser genauso ab.
  await context.addInitScript(() => {
    const orig = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (k) {
      if (k !== 'archiv' || this.name !== 'kv') return orig.call(this, k);
      const req = { result: undefined, error: null, onsuccess: null, onerror: null };
      navigator.storage.getDirectory().then(r => r.getDirectoryHandle('Archiv')).then(
        h => { req.result = h; if (req.onsuccess) req.onsuccess({ target: req }); },
        () => { if (req.onsuccess) req.onsuccess({ target: req }); });
      return req;
    };
  });
  const page = await context.newPage();
  const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  const dialoge = []; page.on('dialog', d => { dialoge.push(d.message()); d.accept(); });
  try {
    await page.goto(url + 'index.html');
    await page.waitForSelector('#start:not([hidden])');
    // Archiv im OPFS anlegen (Ordner „Archiv“ – BerichtKit bekommt ihn als „archiv“, siehe oben)
    await page.evaluate(async ({ PROJEKT, daten }) => {
      const root = await navigator.storage.getDirectory();
      const archiv = await root.getDirectoryHandle('Archiv', { create: true });
      const schreib = async (dir, pfad, inhalt) => {
        const teile = pfad.split('/'); let d = dir;
        for (const t of teile.slice(0, -1)) d = await d.getDirectoryHandle(t, { create: true });
        const w = await (await d.getFileHandle(teile.at(-1), { create: true })).createWritable(); await w.write(inhalt); await w.close();
      };
      const c = document.createElement('canvas'); c.width = 800; c.height = 450; const x = c.getContext('2d');
      x.fillStyle = '#c9b38a'; x.fillRect(0, 0, 800, 450); x.fillStyle = '#333'; x.font = '60px sans-serif'; x.fillText('Probe 1', 250, 240);
      const jpg = await new Promise(r => c.toBlob(r, 'image/jpeg', .9));
      await schreib(archiv, '_Spektron-Mitarbeiter.json', JSON.stringify(daten.ma));
      const p = PROJEKT + '/';
      await schreib(archiv, p + '_Spektron/_Projekt.json', JSON.stringify(daten.pj));
      await schreib(archiv, p + '_Spektron/LabelKit/99.9001_16.10.2026_Daten.json', JSON.stringify(daten.lk));
      await schreib(archiv, p + '_Spektron/ResultKit/_Ergebnisse.json', JSON.stringify(daten.erg));
      await schreib(archiv, p + '_Spektron/FotoKit/_Bildumbenenner.json', JSON.stringify(daten.fk));
      await schreib(archiv, p + 'Fotos/01_P1_Fliesenkleber.jpg', jpg);
      await schreib(archiv, p + 'Mitteilungen/1._Mitteilung_99.9001.docx', 'alt');
    }, { PROJEKT, daten });

    // Öffnen wie aus der Projektzentrale
    await page.goto(url + 'index.html#projekt=' + encodeURIComponent(PROJEKT));
    await page.waitForSelector('#app:not([hidden]) .blatt');
    assert.equal(await page.textContent('#kopfProjekt'), PROJEKT);
    assert.equal(await page.inputValue('#fMitteilung'), '2', 'nächste freie Mitteilung');
    let v = await page.textContent('#vorschau');
    assert.match(v, /Untersuchung auf Asbest und künstliche Mineralfasern \(KMF\)/);
    assert.match(v, /Am 05\.10\.2026 wurde unser Büro durch die Beispiel Versicherung AG beauftragt/);
    assert.match(v, /In Probe 1 \(Material: Fliesenkleber\) wurde Asbest nachgewiesen: Chrysotil, 5 - 20 %\./);
    assert.match(v, /Kanzerogenitätsindex von KI = 26 aus/);
    assert.match(v, /Abb\. 1: Fliesenkleber, Umkleide Schwimmbad\./);
    await page.waitForSelector('#vorschau figure img');
    // Labor fehlt noch → Lücke; Probenehmer ohne Frau/Herr → Hinweis
    assert.match(await page.textContent('#hinweise'), /Lücke im Bericht: \[Labor\]/);

    // Einstellungen: Labor und Personen für das Büro speichern
    await page.click('#btnEinstellungen');
    await page.fill('#eLabor', 'Eurofins Beispiel-Labor GmbH');
    await page.selectOption('tr[data-k="Tst"] select[data-f="geschlecht"]', 'w');
    await page.selectOption('tr[data-k="Mes"] select[data-f="geschlecht"]', 'm');
    await page.selectOption('tr[data-k="Mes"] select[data-f="rolle"]', 'mt');
    await page.click('#eSpeichern');
    await page.waitForFunction(() => !document.getElementById('dlgEinstellungen').open);
    const cfg = await page.evaluate(async () => JSON.parse(await (await (await (await (await navigator.storage.getDirectory()).getDirectoryHandle('Archiv')).getFileHandle('_Spektron-BerichtKit.json')).getFile()).text()));
    assert.equal(cfg.format, 'spektron-berichtkit'); assert.equal(cfg.labor, 'Eurofins Beispiel-Labor GmbH');
    assert.deepEqual(cfg.personen.Mes, { geschlecht: 'm', rolle: 'mt' });

    // Personen wählen: Probenahme durch Messtechniker → zweite Unterschrift automatisch
    await page.selectOption('#fPn', 'Mes');
    await page.selectOption('#fSv', 'Tst');
    assert.equal(await page.inputValue('#fMt'), 'Mes');
    await page.check('input[name=einbau][value=vor1996]');
    v = await page.textContent('#vorschau');
    assert.match(v, /wurden durch Herrn Messer \(Sachverständigenbüro Dr\. Heinz Schiffers & Partner\) im Objekt zwei Materialproben entnommen/);
    assert.match(v, /Die Proben wurden der Eurofins Beispiel-Labor GmbH zur Untersuchung auf Asbest übergeben/);
    assert.match(v, /Der Dämmstoff wurde vor 1996 eingebaut/);
    assert.match(v, /Die Sachverständige.*Dr\. Tanja Test/s); assert.match(v, /Der Messtechniker.*Max Messer/s);
    assert.doesNotMatch(await page.textContent('#hinweise'), /Lücke im Bericht/);

    if (process.env.BERICHT_AUSGABE) { await page.setViewportSize({ width: 1440, height: 1000 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForSelector('#mosaikLeiste .ml-step'); await page.screenshot({ path: path.join(process.env.BERICHT_AUSGABE, 'oberflaeche.png'), fullPage: false }); }
    // Probe abwählen und wieder an
    await page.uncheck('input[data-art="aus"][data-l="P2"]');
    assert.doesNotMatch(await page.textContent('#vorschau'), /KMF/);
    await page.check('input[data-art="aus"][data-l="P2"]');

    // Speichern als 1. Mitteilung → Datei gibt es schon → Abbrechen = „(2)“ – hier: OK = überschreiben
    await page.fill('#fMitteilung', '1'); await page.dispatchEvent('#fMitteilung', 'change');
    await page.click('#btnErstellen');
    await page.waitForSelector('#status .ok');
    assert.ok(dialoge.some(d => /gibt es schon/.test(d)), 'Rückfrage vor dem Überschreiben');
    const b64 = await page.evaluate(async P => {
      const d = await (await (await (await navigator.storage.getDirectory()).getDirectoryHandle('Archiv')).getDirectoryHandle(P)).getDirectoryHandle('Mitteilungen');
      const f = await (await d.getFileHandle('1._Mitteilung_99.9001.docx')).getFile(); const b = new Uint8Array(await f.arrayBuffer());
      let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s);
    }, PROJEKT);
    const buf = Buffer.from(b64, 'base64');
    assert.equal(buf.subarray(0, 2).toString(), 'PK', 'Word-Datei (ZIP)');
    assert.ok(buf.length > 20000);
    if (process.env.BERICHT_AUSGABE) { fs.mkdirSync(process.env.BERICHT_AUSGABE, { recursive: true }); fs.writeFileSync(path.join(process.env.BERICHT_AUSGABE, 'browser_1._Mitteilung_99.9001.docx'), buf); }
    // Angaben zum Bericht liegen für alle im Projektordner (_Spektron/BerichtKit/_BerichtKit.json) – auch der gespeicherte Bericht
    const zustand = await page.evaluate(async P => {
      const p = await (await (await navigator.storage.getDirectory()).getDirectoryHandle('Archiv')).getDirectoryHandle(P);
      const d = await (await p.getDirectoryHandle('_Spektron')).getDirectoryHandle('BerichtKit');
      return JSON.parse(await (await (await d.getFileHandle('_BerichtKit.json')).getFile()).text());
    }, PROJEKT);
    assert.equal(zustand.format, 'spektron-bericht'); assert.equal(zustand.projekt, '99.9001');
    assert.equal(zustand.form.probenehmer, 'Mes'); assert.equal(zustand.form.einbau, 'vor1996');
    assert.deepEqual(zustand.berichte.map(b => b.datei), ['1._Mitteilung_99.9001.docx']);
    // Zwei Rechner gleichzeitig: Ein Kollege ändert ein anderes Feld direkt in der Datei, hier wird gleichzeitig das Datum geändert –
    // beide Änderungen bleiben erhalten, die des Kollegen erscheint auch hier.
    const lesen = () => page.evaluate(async P => {
      const p = await (await (await navigator.storage.getDirectory()).getDirectoryHandle('Archiv')).getDirectoryHandle(P);
      const d = await (await p.getDirectoryHandle('_Spektron')).getDirectoryHandle('BerichtKit');
      return JSON.parse(await (await (await d.getFileHandle('_BerichtKit.json')).getFile()).text());
    }, PROJEKT);
    await page.evaluate(async P => {
      const p = await (await (await navigator.storage.getDirectory()).getDirectoryHandle('Archiv')).getDirectoryHandle(P);
      const fh = await (await (await p.getDirectoryHandle('_Spektron')).getDirectoryHandle('BerichtKit')).getFileHandle('_BerichtKit.json');
      const d = JSON.parse(await (await fh.getFile()).text()); d.form.agSatz = 'die Beispiel Versicherung AG (Regionaldirektion West)'; d.geaendertVon = 'KOL';
      const w = await fh.createWritable(); await w.write(JSON.stringify(d, null, 1)); await w.close();
    }, PROJEKT);
    await page.fill('#fDatum', '2026-10-28'); await page.dispatchEvent('#fDatum', 'change');
    let gemischt = null;
    for (let i = 0; i < 40 && !(gemischt && gemischt.form.datum === '2026-10-28'); i++) { await page.waitForTimeout(150); gemischt = await lesen(); }
    assert.equal(gemischt.form.datum, '2026-10-28', 'eigene Änderung gespeichert');
    assert.equal(gemischt.form.agSatz, 'die Beispiel Versicherung AG (Regionaldirektion West)', 'Änderung des Kollegen bleibt');
    assert.equal(await page.inputValue('#fAg'), 'die Beispiel Versicherung AG (Regionaldirektion West)', 'und erscheint auch hier');
    // Spektron-Leiste: BerichtKit ist der eigene Schritt, die anderen Apps sind Links mit demselben Projekt
    await page.waitForSelector('#mosaikLeiste .ml-step.hier');
    assert.match(await page.textContent('#mosaikLeiste .ml-step.hier'), /BerichtKit/);
    assert.equal(await page.locator('#mosaikLeiste a.ml-step').count(), 5);
    // Ein Kollege (anderer Browser, leerer Speicher) sieht dieselben Angaben
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('berichtkit:form:')) localStorage.removeItem(k); });
    await page.reload(); await page.waitForSelector('#app:not([hidden]) .blatt');
    assert.equal(await page.inputValue('#fPn'), 'Mes');
    assert.equal(await page.inputValue('#fMitteilung'), '1');
    assert.match(await page.textContent('#hinweise'), /Angaben zum Bericht aus dem Projektordner/);
    assert.deepEqual(fehler, [], 'keine Fehler in der Konsole');
    console.log('ok – BerichtKit im Browser: öffnen, Vorschau, Einstellungen, Word-Datei in „Mitteilungen“, Angaben im Projektordner, Spektron-Leiste');
  } catch (e) { console.log('DIALOGE', dialoge, 'FEHLER', fehler); throw e; } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
