import { createContext, useContext } from 'react';
import type { TimedResults } from '../domain/types.ts';

/**
 * 執行期補抓到的練習賽／衝刺排位名次表（見 docs/adr/0005）。
 * 只住在記憶體裡，疊在打包的 sidecar 之上；沒有補抓過就是空表。
 */
export const LiveTimedContext = createContext<TimedResults>({});

export const useLiveTimedResults = (): TimedResults => useContext(LiveTimedContext);
