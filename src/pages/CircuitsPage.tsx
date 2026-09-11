import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { CircuitView } from '../domain/types.ts';
import { useEntrance, type Entrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { Flag } from '../app/Flag.tsx';
import { TrackMap } from '../app/TrackMap.tsx';
import { circuitOutlineFor } from '../data/circuits.ts';
import { localisedCircuit } from '../data/localisation.ts';

interface CircuitsPageProps {
  season: string;
  circuits: CircuitView[];
}

export const CircuitsPage = ({ season, circuits }: CircuitsPageProps): JSX.Element => {
  const { container, item } = useEntrance();

  return (
    <motion.section className="listing" variants={container} initial="hidden" animate="shown">
      <motion.header className="listing__head" variants={item}>
        <p className="hero__eyebrow">{season} 賽季 · {circuits.length} 條賽道</p>
        <h1 className="listing__title">Circuits</h1>
      </motion.header>

      <ul className="circuit-grid">
        {circuits.map((entry) => (
          <CircuitCard key={entry.circuit.id} entry={entry} variants={item} />
        ))}
      </ul>
    </motion.section>
  );
};

interface CircuitCardProps {
  entry: CircuitView;
  variants: Entrance['item'];
}

const CircuitCard = ({ entry, variants }: CircuitCardProps): JSX.Element => {
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
            {weekends.map((w) => `R${w.round}`).join(' · ')}
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
