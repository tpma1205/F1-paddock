/** 正賽總里程（公里、小數一位）：單圈長度 × 圈數。任一缺漏為 null。 */
export const raceDistanceKm = (lengthMetres: number | null, laps: number | null): number | null =>
  lengthMetres === null || laps === null ? null : Math.round((lengthMetres * laps) / 100) / 10;
