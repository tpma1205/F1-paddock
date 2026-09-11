/**
 * 中英對照表 —— **本專案唯一的手工資產**。
 *
 * Jolpica 與 OpenF1 都是純英文，一個中文字都沒有，所以這裡的每一筆都是
 * 人工維護的。資料正確性由 API 保證，但**譯名品質完全取決於這張表**，
 * 它值得被當作內容資產審閱，而不是附屬設定檔。
 *
 * 規則（見 CONTEXT.md 的「雙語命名」）：
 *
 * - 一律採**台灣慣用譯名**：麥拉倫（非邁凱倫）、賓士（非梅賽德斯）、
 *   奧斯頓馬丁（非阿斯頓馬丁）。
 * - 尚無台灣媒體公認譯名者標記 `provisional`，畫面上會顯示可辨識的記號，
 *   方便日後修正。
 * - 缺漏某筆時，畫面**降級為只顯示英文**，不留空白也不報錯 —— 賽曆與
 *   車手陣容每年都會變，這張表必須容許落後於 API。
 */

export interface LocalisedName {
  zh: string;
  /** 尚無公認譯名，採音譯暫定。 */
  provisional?: true;
}

const name = (zh: string): LocalisedName => ({ zh });
const provisional = (zh: string): LocalisedName => ({ zh, provisional: true });

/** 車隊 —— 以 Jolpica 的 constructorId 為鍵。 */
export const TEAM_NAMES: Record<string, LocalisedName> = {
  mercedes: name('賓士'),
  ferrari: name('法拉利'),
  mclaren: name('麥拉倫'),
  red_bull: name('紅牛'),
  rb: name('小紅牛'),
  alpine: name('阿爾派'),
  haas: name('哈斯'),
  audi: name('奧迪'),
  williams: name('威廉斯'),
  aston_martin: name('奧斯頓馬丁'),
  cadillac: name('凱迪拉克'),
};

/** 車手 —— 以 Jolpica 的 driverId 為鍵。 */
export const DRIVER_NAMES: Record<string, LocalisedName> = {
  antonelli: name('安東內利'),
  russell: name('羅素'),
  hamilton: name('漢米爾頓'),
  norris: name('諾里斯'),
  leclerc: name('勒克萊爾'),
  max_verstappen: name('維斯塔潘'),
  piastri: name('皮亞斯特里'),
  hadjar: name('哈賈爾'),
  lawson: name('勞森'),
  gasly: name('加斯利'),
  arvid_lindblad: provisional('林德布拉德'),
  colapinto: provisional('柯拉平托'),
  bearman: name('貝爾曼'),
  bortoleto: provisional('波爾托萊托'),
  hulkenberg: name('霍肯柏格'),
  sainz: name('塞恩斯'),
  albon: name('阿爾本'),
  ocon: name('奧康'),
  alonso: name('阿隆索'),
  // 日本車手的漢字本名，不需音譯。
  tsunoda: name('角田裕毅'),
  stroll: name('斯特羅爾'),
  bottas: name('波塔斯'),
  perez: name('培瑞茲'),
};

/** 賽道 —— 以 Jolpica 的 circuitId 為鍵。 */
export const CIRCUIT_NAMES: Record<string, LocalisedName> = {
  albert_park: name('亞伯特公園賽道'),
  shanghai: name('上海國際賽車場'),
  suzuka: name('鈴鹿賽道'),
  miami: name('邁阿密國際賽道'),
  villeneuve: name('吉爾維倫紐夫賽道'),
  monaco: name('摩納哥賽道'),
  catalunya: name('加泰隆尼亞賽道'),
  red_bull_ring: name('紅牛環賽道'),
  silverstone: name('銀石賽道'),
  spa: name('斯帕-法蘭科爾尚賽道'),
  hungaroring: name('匈牙利賽道'),
  zandvoort: name('贊德沃特賽道'),
  monza: name('蒙扎賽道'),
  // Madring 是 Madrid + Ring 的合成字，2026 年全新啟用，尚無公認譯名。
  madring: provisional('馬德里賽道'),
  baku: name('巴庫市街賽道'),
  sepang: name('雪邦國際賽道'),
  marina_bay: name('濱海灣街道賽道'),
  americas: name('美洲賽道'),
  rodriguez: name('羅德里蓋茲兄弟賽道'),
  interlagos: name('英特拉格斯賽道'),
  vegas: name('拉斯維加斯大道街道賽道'),
  losail: name('盧賽爾國際賽道'),
  yas_marina: name('亞斯碼頭賽道'),
};

/**
 * 大獎賽名稱 —— 以 Jolpica 的英文 raceName 為鍵。
 *
 * **不可用國名或 circuitId 當鍵**：2026 年西班牙有兩場（第 7 站巴塞隆納、
 * 第 14 站馬德里），而同一條賽道在不同年份可能辦不同名稱的大獎賽。
 */
export const RACE_WEEKEND_NAMES: Record<string, LocalisedName> = {
  'Australian Grand Prix': name('澳洲大獎賽'),
  'Chinese Grand Prix': name('中國大獎賽'),
  'Japanese Grand Prix': name('日本大獎賽'),
  'Miami Grand Prix': name('邁阿密大獎賽'),
  'Canadian Grand Prix': name('加拿大大獎賽'),
  'Monaco Grand Prix': name('摩納哥大獎賽'),
  'Barcelona Grand Prix': name('巴塞隆納大獎賽'),
  'Austrian Grand Prix': name('奧地利大獎賽'),
  'British Grand Prix': name('英國大獎賽'),
  'Belgian Grand Prix': name('比利時大獎賽'),
  'Hungarian Grand Prix': name('匈牙利大獎賽'),
  'Dutch Grand Prix': name('荷蘭大獎賽'),
  'Italian Grand Prix': name('義大利大獎賽'),
  'Spanish Grand Prix': name('西班牙大獎賽'),
  'Azerbaijan Grand Prix': name('亞塞拜然大獎賽'),
  // 掛著巴林之名、卻在雪邦舉行。直譯會讓人以為辦在巴林，因此註明地點。
  'Bahrain Grand Prix in Malaysia': name('巴林大獎賽（於馬來西亞舉行）'),
  'Singapore Grand Prix': name('新加坡大獎賽'),
  'United States Grand Prix': name('美國大獎賽'),
  'Mexico City Grand Prix': name('墨西哥城大獎賽'),
  'Brazilian Grand Prix': name('巴西大獎賽'),
  'Las Vegas Grand Prix': name('拉斯維加斯大獎賽'),
  'Qatar Grand Prix': name('卡達大獎賽'),
  'Abu Dhabi Grand Prix': name('阿布達比大獎賽'),
};

const lookup =
  (table: Record<string, LocalisedName>) =>
  (key: string): LocalisedName | null =>
    table[key] ?? null;

export const localisedTeam = lookup(TEAM_NAMES);
export const localisedDriver = lookup(DRIVER_NAMES);
export const localisedCircuit = lookup(CIRCUIT_NAMES);
export const localisedRaceWeekend = lookup(RACE_WEEKEND_NAMES);
