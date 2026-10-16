// 맵 정의: 화산 — 검은 현무암, 용암 강·불빛, 날리는 화산재, 연기 낀 붉은 하늘. 불꽃 용(공격력 강화 버프, 기존 붉은 용 + 용암 둥지)
// 발판은 모두 좌우 대칭 (빨강 쪽 x = W - x - w).
window.MAPS = window.MAPS || {};
MAPS.volcano = {
  name: '화산', desc: '용암 강 위 현무암 발판 · 2단 중앙',
  plats: (W, G) => { const C = W / 2; return [
    { x: C - 150, w: 300, y: G - 210, center: true },        // 화산 분화구 = 불꽃 용 둥지
    { x: C - 300, w: 190, y: G - 108 }, { x: C + 110, w: 190, y: G - 108 }, // 분화구 아래 40px 겹침
    { x: 1080, w: 180, y: G - 112 }, { x: W - 1260, w: 180, y: G - 112 },
    { x: 1440, w: 170, y: G - 108 }, { x: W - 1610, w: 170, y: G - 108 }]; },
  baseX: 230,
  towerSlots: [[560, true], [880, false], [1220, true], [1560, false]],
  obstacles: (W) => [[1360, 'rock'], [1820, 'rock'], [W - 1360, 'rock'], [W - 1820, 'rock']],
  obstStats: { rock: { w: 62, h: 48, hp: 260 }, crate: { w: 50, h: 50, hp: 160 } },
  teamElem: ['water', 'fire'],    // 파랑 = 물방울(용암을 식히는 물), 빨강 = 불씨
  dragon: 'dragon', dragonName: '불꽃 용',
  dragonBuff: { spd: 1.1, jump: 1.1, atk: 0.12, desc: '영웅 공격력 12% 증가 · 이동속도 강화' },
  dragonFx: { glow: 0xffa060, breath: [0xffd060, 0xff8030, 0xff4020, 0xffffff], color: '#ffb080' },
  sky: 0x5a2a2a,
  theme: {
    sky: 0x5a2a2a, fog: 0x6a3028, fogNear: 30, fogFar: 100,
    hemi: [0xffb090, 0x502020, 0.8], sun: 0xff9060, sunDisc: 0xff6a30, sunY: 9,
    ground: 0x3a3236, dirt: 0x241c1e, edge: 0x564549, path: 0x463a3c,
    tufts: [0xff6a1a, 0x5a4a4a, 0x2a2224],
    hills: [0x3b2a2c, 0x4a2c2a, 0x5a3430], hillShape: 'volcano', trees: 'deadtree', treeColor: 0x2a2020,
    clouds: 0x3a2a2a, cloudOpacity: 0.7, ash: true, lava: true,
    plat: { side: 0x2e2628, top: 0x4a3c3c, rim: 0xff6a1a, under: 0x241c1e },
    rock: [0x3b3236, 0x564549, 0xff6a1a], crate: [0x5a4040, 0x3a2a2a],
    lair: null,   // 기본 용암 둥지 (dragons/lair.js)
  },
};
