/**
 * 由 assets/favicon.svg 產生 public/ 底下的三個圖示檔。build 與 dev 前自動執行，
 * 產物不進版控 —— SVG 原稿是唯一真相。
 *
 * - favicon.svg：原稿直接複製（現代瀏覽器）
 * - apple-touch-icon.png 180×180：iOS 會自己切圓角，所以這張**沒有**圓角、不透明
 * - favicon.ico 32×32：舊版瀏覽器與 Safari 的備援；用「PNG 包進 ICO 容器」的格式
 *   （Vista 之後皆支援），不必自己編 BMP
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'assets/favicon.svg');
const OUT = join(ROOT, 'public');

const APPLE_SIZE = 180;
const ICO_SIZE = 32;

/** ICO 容器：6 位元組檔頭 + 16 位元組目錄項 + PNG 原始資料。 */
const wrapPngAsIco = (png: Buffer, size: number): Buffer => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // 保留
  header.writeUInt16LE(1, 2); // 類型：1 = icon
  header.writeUInt16LE(1, 4); // 圖片數

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); // 寬（256 以 0 表示，這裡不會）
  entry.writeUInt8(size, 1); // 高
  entry.writeUInt8(0, 2); // 色盤數
  entry.writeUInt8(0, 3); // 保留
  entry.writeUInt16LE(1, 4); // 色彩平面
  entry.writeUInt16LE(32, 6); // 每像素位元
  entry.writeUInt32LE(png.length, 8); // 資料長度
  entry.writeUInt32LE(header.length + entry.length, 12); // 資料位移

  return Buffer.concat([header, entry, png]);
};

const main = async (): Promise<void> => {
  mkdirSync(OUT, { recursive: true });
  const svg = readFileSync(SOURCE, 'utf8');

  copyFileSync(SOURCE, join(OUT, 'favicon.svg'));

  // iOS 主畫面圖示：去掉圓角，讓系統自己遮罩。
  const squareSvg = Buffer.from(svg.replace(/ rx="\d+"/, ''));
  await sharp(squareSvg).resize(APPLE_SIZE, APPLE_SIZE).png().toFile(join(OUT, 'apple-touch-icon.png'));

  const icoPng = await sharp(Buffer.from(svg)).resize(ICO_SIZE, ICO_SIZE).png().toBuffer();
  writeFileSync(join(OUT, 'favicon.ico'), wrapPngAsIco(icoPng, ICO_SIZE));

  console.log('✓ 圖示已由 assets/favicon.svg 產生：favicon.svg、apple-touch-icon.png、favicon.ico');
};

await main();
