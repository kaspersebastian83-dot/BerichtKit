// Erzeugt Beispielberichte als .docx zum Ansehen (node tests/render-beispiele.cjs <Zielordner>) – nicht Teil der CI.
const fs = require('node:fs'), path = require('node:path');
const D = require('docx'), T = require('../bericht-text.js'), W = require('../bericht-docx.js'), B = require('./daten/beispiel.cjs');
const ziel = process.argv[2] || 'beispiele'; fs.mkdirSync(ziel, { recursive: true });
const bilder = { logoSvg: fs.readFileSync(path.join(__dirname, '../assets/logo-schiffers.svg')), logoPng: fs.readFileSync(path.join(__dirname, '../assets/logo-schiffers.png')), sig: {}, fotos: {} };
const foto = process.env.FOTO ? { data: fs.readFileSync(process.env.FOTO), w: 1600, h: 900 } : null;
const form = (o = {}) => ({ datum: '2026-10-27', mitteilung: 1, variante: 'eigen', probenehmer: 'Mes', sv: 'Tst', mt: 'Mes', ...o });
const faelle = {
  'A_positiv_eine_Probe': { pj: B.pj(), lk: B.lk([[1, '2026-10-16', 'Umkleide Schwimmbad', 'Fliesenkleber', 'Bituminöse Proben / Kleber']]), erg: B.erg([[1, 'chrysotil']]), form: form(), fotos: { P1: [{ datei: 'x.jpg' }] } },
  'B_gemischt_KMF': { pj: B.pj({ versicherungsnehmer: '' }), lk: B.lk([[1, '2026-10-08', 'Dach', 'Wellplatte', 'Faserzementprodukte (z.B. Eternit)'], [2, '2026-10-08', 'EG Flur', 'Putz', 'Putze / Spachtelmassen'], [3, '2026-10-09', 'Dachboden', 'Dämmstoff Mineralwolle', 'Sonstige']]), erg: B.erg([[1, 'chrysotil'], [2, 'kein'], [3, 'kmf']]), form: form({ einbau: 'vor1996' }), fotos: { P1: [{ datei: 'x.jpg' }], P3: [{ datei: 'y.jpg' }] } },
  'C_zugestellt_luecken': { pj: B.pj({ auftragsdatum: '' }), lk: B.lk([[1, '', 'Keller', 'Dachplatte', 'Faserzementprodukte (z.B. Eternit)']]), erg: B.erg([[1, 'kein']]), form: form({ variante: 'zugestellt', sv: '' }) },
};
(async () => { for (const [name, f] of Object.entries(faelle)) {
  const m = T.bericht({ ...f, cfg: B.cfg, mitarbeiter: B.mitarbeiter });
  const fotos = {}; if (foto) for (const p of m.proben) if (p.foto) fotos[p.label] = foto;
  const buf = await D.Packer.toBuffer(W.erstellen(D, m, { ...bilder, fotos }));
  fs.writeFileSync(path.join(ziel, name + '.docx'), buf); console.log(name, buf.length, 'Hinweise:', m.hinweise.length, 'Lücken:', m.luecken.join(' '));
} })();
