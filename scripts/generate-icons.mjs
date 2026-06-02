import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "icons");

const svgSource = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2563eb"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
    fill="#fff" font-family="system-ui,sans-serif" font-size="156" font-weight="700">
    LAB
  </text>
</svg>`.trim();

async function main() {
  fs.mkdirSync(dir, { recursive: true });
  const svg = Buffer.from(svgSource);
  const targets = [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
  ];
  for (const [name, size] of targets) {
    await sharp(svg).resize(size, size).png().toFile(path.join(dir, name));
    console.warn("wrote", path.join("public/icons", name));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
