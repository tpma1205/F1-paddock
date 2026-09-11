/**
 * 車隊 logo 的來源。
 *
 * 依 docs/adr/0003：一律熱連結 F1 官方 CDN、不進 repo，並由畫面層備妥
 * onError 降級。實測 CDN 只有 2025 路徑存在（2026 全 404），且 **Audi 與
 * Cadillac 兩支 2026 新車隊查無檔案**（試過 6 種路徑變體），這兩隊改用
 * 自製字標 —— 所以它們刻意不在下表中。
 */

/**
 * CDN 資產路徑的年份版本。
 *
 * 這**不是**賽季年份（ADR-0004 禁止寫死賽季），而是 F1 為 logo 檔案編的
 * 版本目錄；2026 目錄不存在，2025 是目前可用的最新版本。若日後 F1 補上
 * 新目錄，只需改這一處。
 */
const LOGO_ASSET_VERSION = '2025';

/** Jolpica constructorId → F1 CDN 檔名。沒有列的車隊代表 CDN 上沒有它的 logo。 */
const LOGO_SLUG: Record<string, string> = {
  mercedes: 'mercedes',
  ferrari: 'ferrari',
  mclaren: 'mclaren',
  red_bull: 'red-bull-racing',
  rb: 'racing-bulls',
  alpine: 'alpine',
  haas: 'haas',
  williams: 'williams',
  aston_martin: 'aston-martin',
};

export const teamLogoUrl = (teamId: string): string | null => {
  const slug = LOGO_SLUG[teamId];
  return slug
    ? `https://media.formula1.com/content/dam/fom-website/teams/${LOGO_ASSET_VERSION}/${slug}-logo.png`
    : null;
};

/**
 * 字標用的簡短名稱 —— Jolpica 的 name 帶著 "F1 Team" 這類尾綴
 * （"Cadillac F1 Team"、"Haas F1 Team"），字標上顯示不下也不需要。
 */
export const wordmarkText = (teamName: string): string =>
  teamName.replace(/\s+F1\s+Team$/i, '').trim();
