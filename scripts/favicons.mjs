#!/usr/bin/env node
// The website's icons: a white Anton "C", slanted like the logo's COUGARS, on logo red (chosen 2026-10-06 over
// cropping the logo, which can't be read at tab size). Re-run after a change: node scripts/favicons.mjs
//   favicon.ico            16, 32 and 48 px, for browsers and Google Search (which asks for /favicon.ico)
//   favicon.png            96 px (Google wants a multiple of 48)
//   apple-touch-icon.png   180 px, square (iOS rounds the corners itself)
//   icon-192.png, icon-512.png, icon-maskable-512.png   for manifest.webmanifest (Android)
import { readFileSync, writeFileSync } from "node:fs";
import satori from "satori";
import sharp from "sharp";

const web = new URL("../apps/web/", import.meta.url);
const anton = readFileSync(new URL("src/assets/fonts/Anton.ttf", web));
const out = (name) => new URL(`public/${name}`, web).pathname;
const RED = "#e5131f";
const BIG = 1024; // drawn once at this size, then scaled down

// The letter on its own, cropped to its exact pixels, so centring uses what you see, not the font's metrics.
const svg = await satori(
  {
    type: "div",
    props: {
      style: { width: BIG, height: BIG, display: "flex", alignItems: "center", justifyContent: "center" },
      children: [
        {
          type: "div",
          props: {
            style: { fontFamily: "Anton", fontSize: BIG * 0.8, color: "#fff", transform: "skewX(-10deg)" },
            children: "C",
          },
        },
      ],
    },
  },
  { width: BIG, height: BIG, fonts: [{ name: "Anton", data: anton, weight: 400, style: "normal" }] },
);
const letter = await sharp(Buffer.from(svg)).png().trim().toBuffer();

/**
 * A red tile with the letter centred. `height`: the letter's height as a share of the tile. `radius`: corner
 * rounding as a share of the side (0 = square, for icons the device rounds or masks itself).
 */
async function icon(size, { height = 0.7, radius = 0.22 } = {}) {
  const glyph = await sharp(letter)
    .resize({ height: Math.round(BIG * height) })
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = glyph.info;
  const tile = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BIG}" height="${BIG}"><rect width="${BIG}" height="${BIG}" rx="${BIG * radius}" fill="${RED}"/></svg>`,
  );
  const big = await sharp(tile)
    .composite([{ input: glyph.data, left: Math.round((BIG - w) / 2), top: Math.round((BIG - h) / 2) }])
    .png()
    .toBuffer();
  return sharp(big).resize(size, size).png().toBuffer();
}

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
  ico(await Promise.all(sizes.map(async (size) => ({ size, data: await icon(size) })))),
);
writeFileSync(out("favicon.png"), await icon(96));
writeFileSync(out("apple-touch-icon.png"), await icon(180, { radius: 0 }));
writeFileSync(out("icon-192.png"), await icon(192));
writeFileSync(out("icon-512.png"), await icon(512));
// Android crops maskable icons to a circle or squircle: full-bleed red, the letter inside the safe middle.
writeFileSync(out("icon-maskable-512.png"), await icon(512, { radius: 0, height: 0.5 }));
console.log("Wrote favicon.ico, favicon.png, apple-touch-icon.png, icon-192/512.png, icon-maskable-512.png");
