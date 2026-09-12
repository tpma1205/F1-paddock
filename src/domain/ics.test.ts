import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshot } from '../data/__fixtures__/buildFixtureSnapshot.ts';
import { buildCalendar, escapeText, foldLine } from './ics.ts';

const snapshot = buildFixtureSnapshot();
const ics = buildCalendar({
  season: snapshot.season,
  weekends: snapshot.weekends,
  stamp: snapshot.fetchedAt,
  siteUrl: 'https://example.test/F1-paddock',
  localiseRace: (name) => (name === 'Spanish Grand Prix' ? '西班牙大獎賽' : null),
});

const lines = ics.split('\r\n');
const events = ics.split('BEGIN:VEVENT').length - 1;

describe('buildCalendar —— iCalendar 產生器', () => {
  it('是合法的 VCALENDAR 外殼', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-1)).toBe('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('METHOD:PUBLISH');
  });

  it('每個場次一個事件，涵蓋本季全部 Race Weekend', () => {
    const totalSessions = snapshot.weekends.reduce((n, w) => n + w.sessions.length, 0);
    expect(events).toBe(totalSessions);
    expect(events).toBeGreaterThan(100);
  });

  it('時間以 UTC（Z 後綴）表示 —— 這是時區錯誤會安靜發生的地方', () => {
    // 馬德里正賽 2026-09-13 13:00Z，慣例時長 120 分鐘
    expect(ics).toContain('DTSTART:20260913T130000Z');
    expect(ics).toContain('DTEND:20260913T150000Z');
    // 沒有任何本地時間（無 Z 後綴）的 DTSTART
    const bareStarts = lines.filter((l) => /^DTSTART:\d{8}T\d{6}$/.test(l));
    expect(bareStarts).toEqual([]);
  });

  it('衝刺賽週末的場次也在，且時長不同', () => {
    // 新加坡衝刺賽 10-10 09:00Z + 30 分鐘
    expect(ics).toContain('DTSTART:20261010T090000Z');
    expect(ics).toContain('DTEND:20261010T093000Z');
  });

  it('標題含中英名稱與場次名稱', () => {
    expect(ics).toMatch(/SUMMARY:.*西班牙大獎賽.*Spanish Grand Prix.*正賽/);
  });

  it('沒有中文譯名時只用英文，不留空白', () => {
    expect(ics).toMatch(/SUMMARY:F1 · Italian Grand Prix · 正賽/);
  });

  it('每個事件有穩定且唯一的 UID', () => {
    const uids = lines.filter((l) => l.startsWith('UID:'));
    expect(uids).toHaveLength(events);
    expect(new Set(uids).size).toBe(events);
    expect(uids).toContain('UID:2026-r14-race@f1-paddock');
  });

  it('DTSTAMP 取自快照時間，產出可重現', () => {
    expect(ics).toContain('DTSTAMP:20260910T000000Z');
    const again = buildCalendar({
      season: snapshot.season,
      weekends: snapshot.weekends,
      stamp: snapshot.fetchedAt,
      siteUrl: 'https://example.test/F1-paddock',
      localiseRace: () => null,
    });
    expect(again).toBe(again);
  });

  it('行尾是 CRLF、每行不超過 75 位元組（RFC 5545 折行）', () => {
    expect(ics.includes('\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    for (const line of lines) {
      expect(Buffer.byteLength(line, 'utf8'), line).toBeLessThanOrEqual(75);
    }
  });

  it('地點與描述帶賽道與連結', () => {
    expect(ics).toMatch(/LOCATION:Madring\\, Madrid/);
    expect(ics).toContain('https://example.test/F1-paddock/races/14');
  });
});

describe('escapeText —— RFC 5545 文字跳脫', () => {
  it('逗號、分號、反斜線與換行都要跳脫', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
});

describe('foldLine', () => {
  it('75 位元組以內不折', () => {
    expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short');
  });

  it('超過 75 位元組時折行，續行以一個空白開頭', () => {
    const long = `SUMMARY:${'x'.repeat(100)}`;
    const folded = foldLine(long);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts.slice(1)) expect(part.startsWith(' ')).toBe(true);
    for (const part of parts) expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(75);
    // 拆掉折行後還原
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });

  it('多位元組字元不會被從中間切斷', () => {
    const long = `SUMMARY:${'中'.repeat(60)}`;
    const folded = foldLine(long);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
    for (const part of folded.split('\r\n')) {
      expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(75);
      // 每一段都是合法 UTF-8（沒切壞）
      expect(Buffer.from(part, 'utf8').toString('utf8')).toBe(part);
    }
  });
});
