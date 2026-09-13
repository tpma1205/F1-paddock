/**
 * Profile（簡介）—— 手寫的繁中介紹文字與少量結構化欄位。
 *
 * 與譯名表（localisation.ts）分開：譯名是「名字」、Profile 是「內容」，
 * 維護節奏不同。三張表同檔，方便一次通讀、審閱語氣一致。
 *
 * 規則：
 * - **可選**。本季實體缺 Profile 時畫面不顯示該區塊，測試只警告不失敗 ——
 *   換季時新車手不該擋住自動部署。反之，鍵對不到本季實體時測試失敗（打錯 ID）。
 * - 第三人稱、每則 2–4 句、**不寫會過期的數字**（積分、名次、「目前」）；
 *   可寫穩定事實（首次奪冠年、賽道啟用年）。
 * - 專有名詞遵守譯名表：麥拉倫、賓士、奧斯頓馬丁……
 */

export interface TeamProfile {
  intro: string;
  /** 總部所在地（城市，國家）。 */
  base: string;
  /** 動力單元供應商。 */
  powerUnit: string;
}

export interface DriverProfile {
  intro: string;
}

export interface CircuitProfile {
  intro: string;
}

/** 車隊 —— 以 Jolpica 的 constructorId 為鍵。 */
export const TEAM_PROFILES: Record<string, TeamProfile> = {
  mercedes: {
    intro:
      '賓士車隊是德國汽車製造商的廠隊，2010 年以收購布朗車隊的班底重返 F1。2014 年油電混合規則上路後開啟了連續八年車隊冠軍的統治期，漢米爾頓與羅斯堡的隊內對決是那段時期的招牌戲碼。車隊以布拉克利為基地，動力單元則在布里克斯沃斯自行研發。',
    base: '英國布拉克利',
    powerUnit: 'Mercedes',
  },
  ferrari: {
    intro:
      '法拉利是唯一從 1950 年首季至今未曾缺席的車隊，也是 F1 史上奪冠最多的車隊。紅色賽車、躍馬徽章與義大利車迷「Tifosi」構成了這項運動最鮮明的圖像。車隊總部與動力單元研發都在馬拉內羅，是少數從底盤到引擎完全自製的隊伍。',
    base: '義大利馬拉內羅',
    powerUnit: 'Ferrari',
  },
  mclaren: {
    intro:
      '麥拉倫由紐西蘭車手布魯斯・麥拉倫於 1963 年創立，是 F1 歷史第二悠久的現役車隊。塞納與普羅斯特的 1980 年代末期、漢米爾頓在此出道並首次封王，都是車隊歷史的高光。2020 年代以年輕陣容重返頂尖，2024 年再度奪下車隊冠軍。',
    base: '英國沃金',
    powerUnit: 'Mercedes',
  },
  red_bull: {
    intro:
      '紅牛車隊由能量飲料品牌於 2005 年接手捷豹車隊而成，不到十年就以韋托在 2010 至 2013 年連續四冠改寫了 F1 的權力版圖。2021 年起韋斯塔潘再度帶隊建立王朝。2026 年新規則起，車隊與福特合作自製動力單元，結束多年依賴外部供應商的歷史。',
    base: '英國米爾頓凱恩斯',
    powerUnit: 'Red Bull Ford Powertrains',
  },
  rb: {
    intro:
      '小紅牛是紅牛集團的第二支車隊，前身為米納迪與紅牛二隊（Toro Rosso），長年扮演培養年輕車手的角色 —— 韋托、韋斯塔潘、加斯利都從這裡起步。車隊以義大利法恩札為基地，2026 年起與紅牛主隊一同使用紅牛福特的動力單元。',
    base: '義大利法恩札',
    powerUnit: 'Red Bull Ford Powertrains',
  },
  alpine: {
    intro:
      '阿爾派是雷諾集團的廠隊，2021 年以旗下跑車品牌之名重新命名。恩斯通的基地曾以貝納通與雷諾之名，分別在 1990 年代與 2000 年代帶領舒馬克與阿隆索封王。2026 年起車隊放棄自製動力單元，改用賓士的引擎。',
    base: '英國恩斯通',
    powerUnit: 'Mercedes',
  },
  haas: {
    intro:
      '哈斯是 2016 年加入的美國車隊，由工具機企業家金・哈斯創立，是自 1980 年代以來第一支全新進入 F1 的美國隊伍。車隊採取精簡的營運模式，大量向法拉利採購可共用的零件，並以義大利與英國的據點協同運作。',
    base: '美國坎納波利斯',
    powerUnit: 'Ferrari',
  },
  audi: {
    intro:
      '奧迪在 2026 年新規則上路之際以廠隊身分進入 F1，接手了原本的索伯車隊。索伯自 1993 年起就在瑞士欣維爾運作，中間曾以寶馬索伯與阿爾法羅密歐之名參賽。動力單元在德國諾伊堡自行研發，這是四環品牌第一次出現在 F1 的發車格上。',
    base: '瑞士欣維爾',
    powerUnit: 'Audi',
  },
  williams: {
    intro:
      '威廉斯由法蘭克・威廉斯與帕特里克・海德於 1977 年創立，在 1980 至 1990 年代與麥拉倫平分天下，曼賽爾、普羅斯特、希爾與維倫紐夫都在此封王。2020 年家族出售車隊後進入重建期，基地仍在英國格羅夫。',
    base: '英國格羅夫',
    powerUnit: 'Mercedes',
  },
  aston_martin: {
    intro:
      '奧斯頓馬丁這個名字在 2021 年重返 F1，班底來自銀石旁的喬丹、印度力量與賽點車隊。老闆勞倫斯・史特羅重金投入，在賽道對面興建了全新的工廠與風洞。2026 年起與本田合作，成為其廠隊夥伴。',
    base: '英國銀石',
    powerUnit: 'Honda',
  },
  cadillac: {
    intro:
      '凱迪拉克是通用汽車旗下的豪華品牌，2026 年以第十一支車隊的身分加入 F1，這是十年來第一次有全新隊伍進場。車隊由安德烈提家族發起、通用汽車主導，美國印第安納州與英國銀石各有據點。初期採用法拉利的動力單元，同時在美國開發自家引擎。',
    base: '美國費雪斯',
    powerUnit: 'Ferrari',
  },
};

/** 車手 —— 以 Jolpica 的 driverId 為鍵（票 07 填入）。 */
export const DRIVER_PROFILES: Record<string, DriverProfile> = {};

/** 賽道 —— 以 Jolpica 的 circuitId 為鍵（票 08 填入）。 */
export const CIRCUIT_PROFILES: Record<string, CircuitProfile> = {};

export const teamProfile = (id: string): TeamProfile | null => TEAM_PROFILES[id] ?? null;
export const driverProfile = (id: string): DriverProfile | null => DRIVER_PROFILES[id] ?? null;
export const circuitProfile = (id: string): CircuitProfile | null => CIRCUIT_PROFILES[id] ?? null;
