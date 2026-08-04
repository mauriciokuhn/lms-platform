/**
 * PWA Icon Generator
 *
 * Run: node scripts/generate-icons.js
 * Requires: npm install sharp
 *
 * Generates all icon sizes from the SVG source.
 */

const fs = require("fs");
const path = require("path");

// SVG source - a simple play button icon in a rounded square
const SVG_SOURCE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="80" fill="#18181b"/>
  <path d="M160 160h192a32 32 0 0132 32v128a32 32 0 01-32 32H160a32 32 0 01-32-32V192a32 32 0 0132-32z" fill="white" opacity="0.95"/>
  <path d="M232 208l72 48-72 48V208z" fill="#18181b"/>
  <path d="M256 400l60-60h-40v-20h40l-60-60" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.7"/>
</svg>`;

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, "..", "public", "icons");

async function generate() {
  console.log("📦 Generating PWA icons...");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Save the SVG source
  fs.writeFileSync(path.join(OUTPUT_DIR, "icon.svg"), SVG_SOURCE);
  console.log(`  ✅ icon.svg saved`);

  // Try to use sharp for PNG generation
  try {
    const sharp = require("sharp");
    const svgBuffer = Buffer.from(SVG_SOURCE);

    for (const size of SIZES) {
      const filename = `icon-${size}x${size}.png`;
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(OUTPUT_DIR, filename));
      console.log(`  ✅ ${filename} generated`);
    }
    console.log("\n🎉 All icons generated successfully!");
  } catch {
    console.log("\n⚠️  sharp not installed. Install it to generate PNG icons:");
    console.log("   npm install sharp");
    console.log("   node scripts/generate-icons.js");
    console.log("\nFor now, only the SVG icon is available.");
  }
}

generate().catch(console.error);
