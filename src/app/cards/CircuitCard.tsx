import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { CircuitView } from '../../domain/types.ts';
import type { Entrance } from '../motion.ts';
import { BilingualName } from '../BilingualName.tsx';
import { Flag } from '../Flag.tsx';
import { TrackMap } from '../TrackMap.tsx';
import { circuitOutlineFor } from '../../data/circuits.ts';
import { localisedCircuit } from '../../data/localisation.ts';

interface CircuitCardProps {
  entry: CircuitView;
  variants: Entrance['item'];
}

/** 賽道卡片 —— 賽道列表與首頁預覽共用同一個元件。 */
export const CircuitCard = ({ entry, variants }: CircuitCardProps): JSX.Element => {
  const { circuit, weekends } = entry;
  const outline = circuitOutlineFor(circuit.id);

  return (
    <motion.li variants={variants}>
      <Link to={`/circuits/${circuit.id}`} className="circuit-card">
        <span className="circuit-card__map">
          {outline ? (
            <TrackMap coordinates={outline.coordinates} title={circuit.name} />
          ) : (
            <span className="circuit-card__no-map">尚無平面圖</span>
          )}
        </span>
        <span className="circuit-card__body">
          <span className="circuit-card__rounds">
            {weekends.map((w) => `R${w.round}`).join('、')}
          </span>
          <BilingualName
            canonical={circuit.name}
            localised={localisedCircuit(circuit.id)}
            variant="panel"
          />
          <span className="circuit-card__place">
            <Flag country={circuit.country} />
            {circuit.locality}, {circuit.country}
          </span>
        </span>
      </Link>
    </motion.li>
  );
};
