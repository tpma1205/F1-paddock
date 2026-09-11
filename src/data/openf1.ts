/**
 * OpenF1 的**原始**回應形狀與合併邏輯。
 *
 * OpenF1 補足 Jolpica 沒有的兩樣東西：**車隊代表色**與**車手照片網址**。
 * 兩個 API 沒有共用的識別碼 —— OpenF1 的 team_name（"Red Bull Racing"）
 * 對不上 Jolpica 的 constructorId（"red_bull"）—— 所以用**車手三字母縮寫**
 * 當橋樑：Jolpica 的 `code` 與 OpenF1 的 `name_acronym` 是同一套官方縮寫。
 */

export interface RawOpenF1Driver {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  /** 不含 # 的六碼十六進位，例如 "F47600"；可能為 null。 */
  team_colour: string | null;
  headshot_url: string | null;
}

export interface OpenF1DriverInfo {
  /** 含 # 的十六進位色碼。 */
  teamColour: string | null;
  headshotUrl: string | null;
}

const HEX_COLOUR = /^[0-9a-fA-F]{6}$/;

/** 以縮寫為鍵整理 OpenF1 車手，供合併時查詢。 */
export const indexOpenF1Drivers = (
  drivers: ReadonlyArray<RawOpenF1Driver>,
): ReadonlyMap<string, OpenF1DriverInfo> => {
  const byCode = new Map<string, OpenF1DriverInfo>();

  for (const driver of drivers) {
    // 同一位車手可能在回應中出現多次（不同 session），保留第一筆即可。
    if (byCode.has(driver.name_acronym)) continue;

    byCode.set(driver.name_acronym, {
      teamColour:
        driver.team_colour && HEX_COLOUR.test(driver.team_colour)
          ? `#${driver.team_colour.toLowerCase()}`
          : null,
      headshotUrl: driver.headshot_url || null,
    });
  }

  return byCode;
};
