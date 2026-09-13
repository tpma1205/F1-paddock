/**
 * Jolpica 的國籍（英文 demonym，如 "Italian"）→ 中文與國旗用的國名。
 *
 * 這是「名字級」的資料，與譯名表同等級：本季有車手國籍缺對照時測試失敗。
 * 國旗走既有的 countries.ts，所以 `country` 必須是那張表認得的國名。
 */
interface Nationality {
  zh: string;
  country: string;
}

const NATIONALITIES: Record<string, Nationality> = {
  American: { zh: '美國', country: 'USA' },
  Argentine: { zh: '阿根廷', country: 'Argentina' },
  Australian: { zh: '澳洲', country: 'Australia' },
  Austrian: { zh: '奧地利', country: 'Austria' },
  Belgian: { zh: '比利時', country: 'Belgium' },
  Brazilian: { zh: '巴西', country: 'Brazil' },
  British: { zh: '英國', country: 'UK' },
  Canadian: { zh: '加拿大', country: 'Canada' },
  Chinese: { zh: '中國', country: 'China' },
  Danish: { zh: '丹麥', country: 'Denmark' },
  Dutch: { zh: '荷蘭', country: 'Netherlands' },
  Finnish: { zh: '芬蘭', country: 'Finland' },
  French: { zh: '法國', country: 'France' },
  German: { zh: '德國', country: 'Germany' },
  Italian: { zh: '義大利', country: 'Italy' },
  Japanese: { zh: '日本', country: 'Japan' },
  Mexican: { zh: '墨西哥', country: 'Mexico' },
  Monegasque: { zh: '摩納哥', country: 'Monaco' },
  'New Zealander': { zh: '紐西蘭', country: 'New Zealand' },
  Spanish: { zh: '西班牙', country: 'Spain' },
  Swiss: { zh: '瑞士', country: 'Switzerland' },
  Thai: { zh: '泰國', country: 'Thailand' },
};

export const localisedNationality = (demonym: string): Nationality | null => NATIONALITIES[demonym] ?? null;

/** 對照表裡每個國名都要有國旗 —— 供測試檢查，別讓「有中文、沒國旗」的組合溜進來。 */
export const nationalityCountries = (): string[] => Object.values(NATIONALITIES).map((n) => n.country);
