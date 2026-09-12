import { useState, type JSX } from 'react';
import { RAISED, NEUTRAL_ACCENT } from './tokens.ts';
import type { DriverRef } from '../domain/types.ts';
import { readableOn } from './colour.ts';
import { driverMonogram, headshotAt } from './driverAssets.ts';


interface DriverPhotoProps {
  driver: DriverRef;
  /** 所屬車隊代表色；替代圖與邊框用它。 */
  colour: string | null;
  size?: 'card' | 'hero';
}

/**
 * 車手照片。缺漏或載入失敗時，降級為**車隊代表色 + 三字母縮寫**的替代圖，
 * 尺寸與照片一致，所以列表的視覺節奏不會被破壞（見 docs/adr/0003）。
 *
 * 真實資料裡就有降級案例：角田的 headshot_url 為 null、Hadjar 不在最新 session。
 */
export const DriverPhoto = ({ driver, colour, size = 'card' }: DriverPhotoProps): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const accent = colour ?? NEUTRAL_ACCENT;
  const style = { '--team-colour': accent } as React.CSSProperties;

  if (!driver.headshotUrl || failed) {
    return (
      <span className={`driver-photo driver-photo--${size} driver-photo--plate`} style={style}>
        <span style={{ color: readableOn(accent, RAISED) }}>{driverMonogram(driver)}</span>
      </span>
    );
  }

  return (
    <span className={`driver-photo driver-photo--${size}`} style={style}>
      <img
        src={headshotAt(driver.headshotUrl, size)}
        alt={`${driver.givenName} ${driver.familyName}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
};
