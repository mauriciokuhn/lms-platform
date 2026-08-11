/**
 * Generate PWA Icons, Favicon, and OG Image
 *
 * Run: node scripts/generate-assets.js
 * Prerequisites: npm install sharp
 *
 * This script generates:
 * - PWA icons in 8 sizes (72, 96, 128, 144, 152, 192, 384, 512px)
 * - Favicon (32x32 + 16x16)
 * - OG Image (1200x630px)
 *
 * All generated from the SVG source in public/icons/icon.svg
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const FAVICON_SIZES = [16, 32, 48];
const OG_SIZE = { w: 1200, h: 630 };

async function main() {
  const svgBuffer = fs.readFileSync(
    path.join(__dirname, "..", "public", "icons", "icon.svg")
  );

  const outDir = path.join(__dirname, "..", "public", "icons");

  // Generate PWA icons
  console.log("Generating PWA icons...");
  for (const size of SIZES) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}x${size}.png`));
    console.log(`  ✅ icon-${size}x${size}.png`);
  }

  // Brand mark reused in the OG image (kept in sync with public/icons/icon.svg)
  const iconMark = `
    <!-- light rays -->
    <g stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.9">
      <path d="M256 60v-26"/>
      <path d="M166 88l-20-20"/>
      <path d="M346 88l20-20"/>
    </g>
    <!-- sparkle -->
    <path d="M400 128l9 22 22 9-22 9-9 22-9-22-22-9 22-9z" fill="#ffffff" opacity="0.9"/>
    <!-- lightbulb -->
    <g fill="#1c1917">
      <path d="M256 118c-46 0-80 33-80 74 0 30 17 50 34 64v22h92v-22c17-14 34-34 34-64 0-41-34-74-80-74z"/>
      <rect x="222" y="290" width="68" height="16" rx="7"/>
      <rect x="238" y="306" width="36" height="10" rx="5"/>
    </g>
    <circle cx="256" cy="186" r="26" fill="#ffffff" opacity="0.14"/>
    <path d="M248 160l18 24h-11l-5 22-18-26h11l5-20z" fill="#ffffff" opacity="0.95"/>
    <!-- open book -->
    <g fill="#1c1917">
      <path d="M96 354l160 32V258l-160-34z"/>
      <path d="M416 354l-160 32V258l160-34z"/>
    </g>
    <path d="M256 258v128" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.9"/>`;

  // Generate OG image (dark zinc gradient + amber brand accent)
  console.log("\nGenerating OG image...");
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#18181b"/>
        <stop offset="100%" style="stop-color:#27272a"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="38%" r="45%">
        <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:0.16"/>
        <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <g transform="translate(408 34) scale(0.75)">${iconMark}</g>
    <text x="600" y="452" font-family="system-ui,sans-serif" font-size="84" font-weight="bold" fill="#fbbf24" text-anchor="middle">Ponto do Saber</text>
    <text x="600" y="516" font-family="system-ui,sans-serif" font-size="32" fill="#e4e4e7" text-anchor="middle">Aprendizado Online</text>
    <text x="600" y="566" font-family="system-ui,sans-serif" font-size="22" fill="#a1a1aa" text-anchor="middle">Cursos online gratuitos com certificados digitais</text>
  </svg>`;

  await sharp(Buffer.from(ogSvg))
    .resize(OG_SIZE.w, OG_SIZE.h)
    .png()
    .toFile(path.join(__dirname, "..", "public", "og-image.png"));
  console.log("  ✅ og-image.png");

  // Generate favicon
  console.log("\nGenerating favicon...");
  const faviconDir = path.join(__dirname, "..", "public");
  // Generate each favicon size listed in FAVICON_SIZES
  for (const size of FAVICON_SIZES) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(faviconDir, `favicon-${size}x${size}.png`));
    console.log(`  ✅ favicon-${size}x${size}.png`);
  }

  // Copy 32px as favicon.ico (most browsers accept PNG as favicon)
  fs.copyFileSync(
    path.join(faviconDir, "favicon-32x32.png"),
    path.join(faviconDir, "favicon.ico")
  );
  console.log("  ✅ favicon.ico (PNG)");
  console.log("  ✅ favicon-32x32.png");
  console.log("  ✅ favicon-16x16.png");

  console.log("\n🎉 All assets generated!");
}

main().catch(console.error);
