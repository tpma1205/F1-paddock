import type { JSX } from 'react';
import type { LocalisedName } from '../data/localisation.ts';

interface BilingualNameProps {
  /** 英文正式名稱 —— 這是實體在賽場、轉播與官方文件上的識別。 */
  canonical: string;
  /** 中文譯名；缺漏時傳 null，畫面自動降級為只顯示英文。 */
  localised: LocalisedName | null;
  variant?: 'hero' | 'panel' | 'inline';
}

/**
 * 專有名詞的雙語呈現：**英文大字在上、中文小字在下**。
 *
 * 英文為主是因為車手的名字印在車上、頭盔上與轉播字幕上的都是英文 ——
 * 英文才是這些實體的正式識別，中文是輔助理解。介面文字（導覽、狀態、
 * 說明）則相反，一律中文且不做雙語並陳。
 *
 * 對照表缺漏時只顯示英文，不留空白也不報錯（見 docs/spec/0001）。
 */
export const BilingualName = ({
  canonical,
  localised,
  variant = 'inline',
}: BilingualNameProps): JSX.Element => (
  <span className={`bilingual bilingual--${variant}`}>
    <span className="bilingual__canonical">{canonical}</span>
    {localised && (
      <span className="bilingual__localised">
        {localised.zh}
        {localised.provisional && (
          <span className="bilingual__provisional" title="暫定譯名，尚無台灣媒體公認譯法">
            暫譯
          </span>
        )}
      </span>
    )}
  </span>
);
