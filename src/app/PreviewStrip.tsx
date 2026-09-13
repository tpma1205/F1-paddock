import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useEntrance } from './motion.ts';

interface PreviewStripProps {
  title: string;
  href: string;
  /** 投給頂部進度條與頁面底色的代表色；沒有則回到骨幹紅。 */
  accent?: string | undefined;
  children: React.ReactNode;
}

/**
 * 首頁的橫向預覽區：一列可橫向滑動的卡片 + 「查看全部」入口。
 *
 * 卡片元件與完整列表頁共用（src/app/cards），這裡只負責排版。
 * 橫向捲動用原生 overflow + scroll-snap，不引入輪播套件。
 */
export const PreviewStrip = ({ title, href, accent, children }: PreviewStripProps): JSX.Element => {
  const { container, item } = useEntrance();

  return (
    <motion.section
      className="strip"
      data-accent={accent}
      variants={container}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.header className="strip__head" variants={item}>
        <h2 className="strip__title">{title}</h2>
        <Link to={href} className="standings__more">
          查看全部
        </Link>
      </motion.header>

      <ul className="strip__track">{children}</ul>
    </motion.section>
  );
};
