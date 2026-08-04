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

  // Generate OG image (with gradient background)
  console.log("\nGenerating OG image...");
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#18181b"/>
        <stop offset="100%" style="stop-color:#27272a"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <text x="600" y="260" font-family="system-ui,sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">LMS Platform</text>
    <text x="600" y="340" font-family="system-ui,sans-serif" font-size="32" fill="#a1a1aa" text-anchor="middle">Aprendizado Online</text>
    <text x="600" y="400" font-family="system-ui,sans-serif" font-size="20" fill="#71717a" text-anchor="middle">Cursos online gratuitos com certificados digitais</text>
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
