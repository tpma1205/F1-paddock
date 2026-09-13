import { useRef, type JSX } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import type { CircuitView } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { Flag } from '../app/Flag.tsx';
import { TrackMap } from '../app/TrackMap.tsx';
import { circuitOutlineFor } from '../data/circuits.ts';
import { circuitInfoFor } from '../data/circuitInfo.ts';
import { localisedCircuit, localisedRaceWeekend } from '../data/localisation.ts';
import { circuitProfile } from '../data/profiles.ts';
import { raceDistanceKm } from '../domain/circuitStats.ts';
import { ProfileSection } from '../app/ProfileSection.tsx';

interface CircuitPageProps {
  season: string;
  circuits: CircuitView[];
}

const formatKm = (metres: number): string => `${(metres / 1000).toFixed(3)} km`;

export const CircuitPage = ({ season, circuits }: CircuitPageProps): JSX.Element => {
  const { circuitId } = useParams();
  const entry = circuits.find((candidate) => candidate.circuit.id === circuitId);
  const { container, item } = useEntrance();
  const zoomDialog = useRef<HTMLDialogElement>(null);

  if (!entry) {
    return (
      <section className="listing">
        <h1 className="listing__title">找不到這條賽道</h1>
        <p className="hero__note">
          <Link to="/circuits">回到賽道列表</Link>
        </p>
      </section>
    );
  }

  const { circuit, weekends } = entry;
  const outline = circuitOutlineFor(circuit.id);
  const info = circuitInfoFor(circuit.id);
  const lapRecord = info?.lapRecord ?? null;
  const distance = raceDistanceKm(outline?.lengthMetres ?? null, info?.laps ?? null);

  return (
    <motion.article className="circuit-detail" variants={container} initial="hidden" animate="shown">
      <motion.header className="circuit-detail__head" variants={item}>
        <p className="hero__eyebrow">
          {season} 賽季{weekends.map((w) => `第 ${w.round} 站`).join('、')}
        </p>
        <h1 className="hero__title hero__title--compact">
          <BilingualName canonical={circuit.name} localised={localisedCircuit(circuit.id)} variant="hero" />
        </h1>
        <p className="circuit-detail__place">
          <Flag country={circuit.country} />
          <span>
            {circuit.locality}, {circuit.country}
          </span>
        </p>
      </motion.header>

      {/*
       * 平面圖不放進 stagger —— 它的動畫由滾動驅動（見 TrackMap），
       * 不該再疊一層進場淡入。
       */}
      {outline ? (
        <figure className="circuit-detail__figure">
          <button
            type="button"
            className="circuit-detail__zoom"
            onClick={() => zoomDialog.current?.showModal()}
            aria-label="放大檢視賽道平面圖"
          >
            <TrackMap coordinates={outline.coordinates} mode="scroll" title={`${circuit.name} 平面圖`} />
          </button>
          <figcaption>賽道平面圖，紅點為起跑線。點擊可放大。</figcaption>
        </figure>
      ) : (
        <p className="hero__note">此賽道尚無平面圖，其餘資訊照常提供。</p>
      )}

      <motion.ul className="stat-row" variants={item}>
        {outline?.lengthMetres != null && (
          <li className="stat stat--large">
            <span className="stat__value">{formatKm(outline.lengthMetres)}</span>
            <span className="stat__label">單圈長度</span>
          </li>
        )}
        {info && (
          <li className="stat stat--large">
            <span className="stat__value">{info.turns}</span>
            <span className="stat__label">彎道</span>
          </li>
        )}
        {info && (
          <li className="stat stat--large">
            <span className="stat__value">{info.laps}</span>
            <span className="stat__label">正賽圈數</span>
          </li>
        )}
        {distance !== null && (
          <li className="stat stat--large">
            <span className="stat__value">{distance.toFixed(1)} km</span>
            <span className="stat__label">正賽總里程</span>
          </li>
        )}
        {outline?.altitudeMetres != null && (
          <li className="stat stat--large">
            <span className="stat__value">{outline.altitudeMetres} m</span>
            <span className="stat__label">海拔</span>
          </li>
        )}
      </motion.ul>

      <ProfileSection intro={circuitProfile(circuit.id)?.intro ?? null} variants={item} />

      <motion.dl className="circuit-detail__facts" variants={item}>
        <div>
          <dt>單圈紀錄</dt>
          <dd>
            {lapRecord ? (
              <>
                <strong>{lapRecord.time}</strong>
                <span>
                  {lapRecord.driver}，{lapRecord.year}
                </span>
              </>
            ) : (
              <span className="circuit-detail__none">尚無紀錄</span>
            )}
          </dd>
        </div>
        <div>
          <dt>本季站次</dt>
          <dd>
            {weekends.map((w) => (
              <span key={w.round} className="circuit-detail__weekend">
                <span className="circuit-detail__round">R{w.round}</span>
                <BilingualName canonical={w.name} localised={localisedRaceWeekend(w.name)} />
              </span>
            ))}
          </dd>
        </div>
      </motion.dl>

      {outline && (
        <dialog
          ref={zoomDialog}
          className="zoom-dialog"
          onClick={(event) => {
            // 點擊背景關閉；點擊內容不關閉
            if (event.target === event.currentTarget) zoomDialog.current?.close();
          }}
        >
          <div className="zoom-dialog__body">
            <TrackMap coordinates={outline.coordinates} title={`${circuit.name} 平面圖（放大）`} />
          </div>
          <button type="button" className="zoom-dialog__close" onClick={() => zoomDialog.current?.close()}>
            關閉
          </button>
        </dialog>
      )}
    </motion.article>
  );
};
