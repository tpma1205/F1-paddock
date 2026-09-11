/**
 * 車手照片的尺寸變體。
 *
 * OpenF1 給的 headshot_url 尾段是 `.transform/1col/image.png` —— F1 CDN 的
 * 尺寸轉換指令，1col 是 93px 的最小版。實測 2col（206px）到 8col（884px）
 * 都存在；卡片用 2col、詳情頁用 4col（432px、64KB），不需要更大。
 *
 * 依 docs/adr/0003 熱連結，畫面層備 onError 降級。
 */
const SIZE_SEGMENT: Record<'card' | 'hero', string> = {
  card: '2col',
  hero: '4col',
};

export const headshotAt = (url: string, size: 'card' | 'hero'): string =>
  url.replace(/\/(\d+)col\//, `/${SIZE_SEGMENT[size]}/`);

/**
 * 照片缺漏時替代圖上的文字：官方三字母縮寫優先，沒有才由姓名取首字母。
 * 縮寫是 F1 轉播與計時螢幕上的標準識別，比首字母更貼近車迷的習慣。
 */
export const driverMonogram = (driver: {
  code: string | null;
  givenName: string;
  familyName: string;
}): string =>
  driver.code ??
  `${driver.givenName.charAt(0)}${driver.familyName.charAt(0)}`.toUpperCase();
