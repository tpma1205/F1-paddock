import { motion } from 'motion/react';
import type { JSX } from 'react';
import type { Entrance } from './motion.ts';

interface Fact {
  label: string;
  value: string;
}

interface ProfileSectionProps {
  /** 簡介文字；沒有就不渲染段落。 */
  intro: string | null;
  /** 結構化欄位；沒有值的欄位由呼叫端先濾掉。 */
  facts?: Fact[];
  variants: Entrance['item'];
}

/**
 * 「簡介」區塊：一段文字 + 少量欄位。**兩者都沒有時整個區塊不渲染** ——
 * Profile 是可選的，缺文字不該留下一個空標題。
 */
export const ProfileSection = ({ intro, facts = [], variants }: ProfileSectionProps): JSX.Element | null => {
  if (!intro && facts.length === 0) return null;

  return (
    <motion.section className="profile" variants={variants}>
      <h2 className="section-title">簡介</h2>
      {intro && <p className="profile__intro">{intro}</p>}
      {facts.length > 0 && (
        <dl className="facts">
          {facts.map((fact) => (
            <div key={fact.label} className="facts__item">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </motion.section>
  );
};
