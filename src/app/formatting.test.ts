import { describe, expect, it } from 'vitest';
import {
  formatCompactCountdown,
  formatFetchedAt,
  formatSessionClock,
  formatSessionDay,
  formatTimeZoneLabel,
  toCountdown,
} from './formatting.ts';

describe('toCountdown', () => {
  it('把毫秒差拆成天時分秒', () => {
    const ms = ((3 * 24 + 5) * 60 * 60 + 22 * 60 + 10) * 1000;
    expect(toCountdown(ms)).toEqual({ days: 3, hours: 5, minutes: 22, seconds: 10 });
  });

  it('不足一天時天數為零', () => {
    expect(toCountdown(90 * 60 * 1000)).toEqual({
      days: 0,
      hours: 1,
      minutes: 30,
      seconds: 0,
    });
  });

  it('負值夾為零 —— 進行中或已結束不該顯示負數', () => {
    expect(toCountdown(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});

describe('時區呈現', () => {
  const madridFp1 = '2026-09-11T11:30:00.000Z';

  it('標示出時區名稱與偏移，讓自動偵測的結果是可見的', () => {
    const label = formatTimeZoneLabel(new Date(madridFp1), 'Asia/Taipei');
    expect(label).toContain('GMT+8');
    expect(label.length).toBeGreaterThan('GMT+8'.length);
  });

  it('把 UTC 換算成使用者所在時區', () => {
    // 11:30Z 在台北是隔日凌晨前的 19:30，在倫敦是 12:30（英國夏令時間）
    expect(formatFetchedAt(madridFp1, 'Asia/Taipei')).toContain('19:30');
    expect(formatFetchedAt(madridFp1, 'Europe/London')).toContain('12:30');
  });

  it('場次的星期與時刻依時區各自換算', () => {
    expect(formatSessionDay(madridFp1, 'Asia/Taipei')).toBe('週五');
    expect(formatSessionClock(madridFp1, 'Asia/Taipei')).toBe('19:30');
    expect(formatSessionClock(madridFp1, 'Europe/London')).toBe('12:30');
  });

  it('跨日時星期跟著使用者時區走，而非 UTC 的日期', () => {
    // 09-13 22:00Z 在台北已是 09-14（週一）凌晨 06:00
    const lateNight = '2026-09-13T22:00:00.000Z';

    expect(formatSessionDay(lateNight, 'UTC')).toBe('週日');
    expect(formatSessionDay(lateNight, 'Asia/Taipei')).toBe('週一');
  });
});

describe('formatCompactCountdown', () => {
  const ms = (h: number, m = 0) => (h * 60 + m) * 60 * 1000;

  it('超過一天時顯示到小時為止', () => {
    expect(formatCompactCountdown(ms(24 * 3 + 5, 22))).toBe('3 天 5 時');
  });

  it('不足一天時顯示時與分', () => {
    expect(formatCompactCountdown(ms(20, 26))).toBe('20 時 26 分');
  });

  it('不足一小時時只顯示分', () => {
    expect(formatCompactCountdown(ms(0, 45))).toBe('45 分');
  });

  it('不足一分鐘時改以文字表達，避免顯示「0 分」', () => {
    expect(formatCompactCountdown(30_000)).toBe('即將開始');
    expect(formatCompactCountdown(0)).toBe('即將開始');
  });

  it('一律不含秒數 —— 列表上五個場次同時跳秒會讓面板閃爍', () => {
    expect(formatCompactCountdown(ms(1, 1))).not.toMatch(/秒/);
  });
});
