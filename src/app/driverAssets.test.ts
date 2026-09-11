import { describe, expect, it } from 'vitest';
import { driverMonogram, headshotAt } from './driverAssets.ts';

const OPENF1_URL =
  'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png';

describe('headshotAt', () => {
  it('把 1col 換成卡片或詳情頁所需的尺寸', () => {
    expect(headshotAt(OPENF1_URL, 'card')).toContain('/2col/');
    expect(headshotAt(OPENF1_URL, 'hero')).toContain('/4col/');
    expect(headshotAt(OPENF1_URL, 'hero')).not.toContain('/1col/');
  });

  it('沒有尺寸段的網址原樣回傳', () => {
    expect(headshotAt('https://example.com/photo.png', 'hero')).toBe('https://example.com/photo.png');
  });
});

describe('driverMonogram', () => {
  it('優先使用官方三字母縮寫', () => {
    expect(driverMonogram({ code: 'ANT', givenName: 'Andrea Kimi', familyName: 'Antonelli' })).toBe('ANT');
  });

  it('沒有縮寫時取姓名首字母', () => {
    expect(driverMonogram({ code: null, givenName: 'Lando', familyName: 'Norris' })).toBe('LN');
  });
});
