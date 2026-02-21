/**
 * Chrome Extension용 아이콘 생성 스크립트
 * 보라색 배경에 흰색 카메라 아이콘
 */
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BG_COLOR = 0x6366f1ff;  // purple-500
const FG_COLOR = 0xffffffff;  // white

async function createIcon(size) {
  const img = new Jimp({ width: size, height: size, color: BG_COLOR });

  const cx = size / 2;
  const cy = size / 2;
  const bodyR = size * 0.35;
  const lensR = size * 0.15;

  // 카메라 본체 (흰색 원형)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / bodyR;
      const dy = (y - cy) / (bodyR * 1.0);
      if (dx * dx + dy * dy <= 1.0) {
        img.bitmap.data.writeUInt32BE(FG_COLOR, (y * size + x) * 4);
      }
    }
  }

  // 렌즈 (보라색 동심원)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= lensR) {
        img.bitmap.data.writeUInt32BE(BG_COLOR, (y * size + x) * 4);
      }
      if (d <= lensR * 0.5) {
        img.bitmap.data.writeUInt32BE(FG_COLOR, (y * size + x) * 4);
      }
    }
  }

  return img;
}

async function main() {
  const iconsDir = join(__dirname, '..', 'icons');
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  for (const size of [16, 48, 128]) {
    const icon = await createIcon(size);
    const filePath = join(iconsDir, `icon${size}.png`);
    await icon.write(filePath);
    console.log(`Created ${filePath}`);
  }
}

main().catch(console.error);
