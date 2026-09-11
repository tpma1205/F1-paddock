/**
 * Jolpica 回傳的國家名稱 → ISO 3166-1 alpha-2 代碼。
 *
 * API 用的是口語國名（"UK"、"USA"、"UAE"）而非標準代碼，所以需要這張表。
 * 涵蓋當前球季用到的 20 個國家；未涵蓋的國家回傳 null，由呼叫端降級處理
 * —— 賽曆每年會變，這張表必須容許缺漏而不是壞掉。
 */
const ISO_CODE: Record<string, string> = {
  Australia: 'au',
  Austria: 'at',
  Azerbaijan: 'az',
  Bahrain: 'bh',
  Belgium: 'be',
  Brazil: 'br',
  Canada: 'ca',
  China: 'cn',
  France: 'fr',
  Germany: 'de',
  Hungary: 'hu',
  Italy: 'it',
  Japan: 'jp',
  Malaysia: 'my',
  Mexico: 'mx',
  Monaco: 'mc',
  Netherlands: 'nl',
  Portugal: 'pt',
  Qatar: 'qa',
  'Saudi Arabia': 'sa',
  Singapore: 'sg',
  Spain: 'es',
  UAE: 'ae',
  UK: 'gb',
  USA: 'us',
};

export const isoCodeFor = (country: string): string | null => ISO_CODE[country] ?? null;

/**
 * 旗幟圖檔網址。
 *
 * 用點陣圖而非 emoji：**Windows 不會把 regional indicator 渲染成旗子**，
 * 會顯示成 "ES" 這樣的兩個字母。用 SVG 則某些國家（如西班牙的國徽）
 * 檔案達 150KB，PNG 只要不到 1KB。
 *
 * 依 docs/adr/0003，圖片一律熱連結、不進 repo，且必須有 onError 降級。
 */
export const flagUrl = (country: string, width: 40 | 80 = 80): string | null => {
  const code = isoCodeFor(country);
  return code === null ? null : `https://flagcdn.com/w${width}/${code}.png`;
};
