import { useState, type JSX } from 'react';
import { flagUrl, isoCodeFor } from './countries.ts';

/**
 * 國旗。載入失敗或查無該國時，降級為帶國碼的銘牌。
 *
 * 降級是**常態機制而非例外處理**（見 docs/adr/0003）—— 外部圖片隨時可能
 * 失效，銘牌的尺寸與旗幟一致，所以版面不會因此跳動。
 */
export const Flag = ({ country }: { country: string }): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const url = flagUrl(country);
  const code = isoCodeFor(country);

  if (url === null || failed) {
    return (
      <span className="flag flag--plate" title={country}>
        {(code ?? country.slice(0, 2)).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className="flag"
      src={url}
      alt={country}
      width={40}
      height={30}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};
