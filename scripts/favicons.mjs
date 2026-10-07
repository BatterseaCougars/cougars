#!/usr/bin/env node
// The website's icons, from the club logo (apps/web/src/assets/cougars.png): the cougar's face only, because the
// wordmark can't be read at tab size. Re-run after a logo change: node scripts/favicons.mjs
// The team app (team/app/public) gets the same face on carbon for its tab and iPhone icons; its manifest icons
// keep the full logo.
//   favicon.ico            16, 32 and 48 px, for browsers and Google Search (which asks for /favicon.ico)
//   favicon.png            96 px (Google wants a multiple of 48)
//   apple-touch-icon.png   180 px on the site's carbon, for iPhone home screens
//   icon-192.png, icon-512.png, icon-maskable-512.png   for manifest.webmanifest (Android)
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const web = new URL("../apps/web/", import.meta.url);
const logo = new URL("src/assets/cougars.png", web).pathname;
const out = (name) => new URL(`public/${name}`, web).pathname;
const teamOut = (name) => new URL(`../team/app/public/${name}`, import.meta.url).pathname;
const CARBON = "#0d0d0f";
// The face, ear to fangs: chosen by eye at 16 px (2026-10-06).
const FACE = { left: 715, top: 15, width: 635, height: 635 };

const face = await sharp(logo).extract(FACE).png().toBuffer();
const transparent = (size) => sharp(face).resize(size, size).png().toBuffer();
// A carbon tile with rounded corners, so the tab icon reads as a square on light and dark browser chrome.
const tile = async (size, padding) => {
  const r = Math.round(size * 0.2);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}"/></svg>`,
  );
  return sharp(await onCarbon(size, padding))
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
};
// On carbon, with the face inset by `padding` (a share of the side) so rounded or masked corners don't clip it.
const onCarbon = async (size, padding) => {
  const inner = Math.round(size * (1 - 2 * padding));
  return sharp({ create: { width: size, height: size, channels: 4, background: CARBON } })
    .composite([{ input: await sharp(face).resize(inner, inner).png().toBuffer(), gravity: "center" }])
    .png()
    .toBuffer();
};

// An .ico is a small directory of PNGs.
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size % 256, e);
    header.writeUInt8(size % 256, e + 1);
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const sizes = [16, 32, 48];
writeFileSync(
  out("favicon.ico"),
  ico(await Promise.all(sizes.map(async (size) => ({ size, data: await transparent(size) })))),
);
writeFileSync(out("favicon.png"), await transparent(96));
writeFileSync(out("apple-touch-icon.png"), await onCarbon(180, 0.08));
writeFileSync(out("icon-192.png"), await onCarbon(192, 0.08));
writeFileSync(out("icon-512.png"), await onCarbon(512, 0.08));
// Android crops maskable icons to a circle: keep the face inside the middle 80%.
writeFileSync(out("icon-maskable-512.png"), await onCarbon(512, 0.18));
writeFileSync(teamOut("favicon.png"), await tile(96, 0.06));
writeFileSync(teamOut("apple-touch-icon.png"), await onCarbon(180, 0.08));
console.log(
  "Wrote favicon.ico, favicon.png, apple-touch-icon.png, icon-192/512.png, icon-maskable-512.png, and the team app's favicon.png and apple-touch-icon.png",
);
