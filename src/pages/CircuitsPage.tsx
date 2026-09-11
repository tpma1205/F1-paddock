import type { JSX } from 'react';
import { motion } from 'motion/react';
import type { CircuitView } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { CircuitCard } from '../app/cards/CircuitCard.tsx';

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
