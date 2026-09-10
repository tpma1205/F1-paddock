import { describe, expect, it } from 'vitest';
import { formatFetchedAt, formatTimeZoneLabel, toCountdown } from './formatting.ts';

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
});
