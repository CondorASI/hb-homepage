// Produces the image slot files from the untouched originals in public/images/source/.
// Run: npm run images
import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';

const SRC = 'public/images/source';
const OUT = 'public/images';
await mkdir(`${OUT}/logos`, { recursive: true });

// slot: [source, width, height, sizes-to-export]
const slots = {
  hero:       { src: `${SRC}/overleg.webp`,                              w: 640,  h: 800,  scales: [1, 2] },      // 4:5
  team:       { src: `${SRC}/krista-henk-sfeer-oogcontact-liggend.webp`, w: 1200, h: 600,  scales: [1, 1.7] },    // 2:1 (source is 2048 wide, so 2x tops out at 2040)
  aanpak:     { src: `${SRC}/sessions/vergadering-groep.webp`,           w: 800,  h: 450,  scales: [1, 0.5] },    // 16:9, source is only 800px; 0.5 = 400w for phones
  case:       { src: `${SRC}/zakelijk-overleg-aan-tafel.webp`,           w: 900,  h: 600,  scales: [1] },         // 3:2 as-is
  instrument: { src: `${SRC}/talentscan3.webp`,                          w: 700,  h: 525,  scales: [1, 2] },      // 4:3
};

for (const [name, s] of Object.entries(slots)) {
  for (const scale of s.scales) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale);
    const suffix = scale === 1 ? '' : scale > 1 ? '@2x' : '-sm';
    const info = await sharp(s.src)
      .resize(w, h, { fit: 'cover', position: 'attention', withoutEnlargement: false })
      .webp({ quality: 80 })
      .toFile(`${OUT}/${name}${suffix}.webp`);
    console.log(`${name}${suffix}.webp ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}kB`);
  }
}

// Open Graph image 1200x630 from the team photo
const og = await sharp(slots.team.src).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/og.jpg`);
console.log(`og.jpg ${og.width}x${og.height} ${(og.size / 1024).toFixed(0)}kB`);

// White logo for the footer: keep as PNG (tiny), also trim
await sharp(`${SRC}/HB_Beeldmerk_wit.png`).trim().png().toFile(`${OUT}/logo-white.png`);

// Client logos: trim whitespace, normalise to 40px tall (1x) and 80px tall (@2x)
const logos = ['De-Eerste-Kamer','Gemeente-Den-Haag','Feadship','CGI','fokker','Gemeente-Alphen-aan-den-Rijn','akerboom','De-Vries-Scheepsbouw'];
const meta = {};
for (const l of logos) {
  const base = sharp(`${SRC}/logos/${l}.webp`);
  const m = await base.metadata();
  const trimmed = await sharp(`${SRC}/logos/${l}.webp`).trim({ threshold: 20 }).toBuffer();
  const info = await sharp(trimmed).resize({ height: 40 }).webp({ quality: 85, alphaQuality: 90 }).toFile(`${OUT}/logos/${l}.webp`);
  await sharp(trimmed).resize({ height: 80 }).webp({ quality: 85, alphaQuality: 90 }).toFile(`${OUT}/logos/${l}@2x.webp`);
  meta[l] = { w: info.width, h: info.height };
  console.log(`logos/${l}.webp ${info.width}x${info.height} (+@2x) alpha=${m.hasAlpha} ${(info.size / 1024).toFixed(0)}kB`);
}
console.log(JSON.stringify(meta));
