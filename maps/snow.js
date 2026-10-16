// 맵 정의: 눈 덮인 설원 — 소나무, 얼음, 내리는 눈, 차가운 하늘. 얼음 용(공격 시 둔화 버프)
// 발판은 모두 좌우 대칭 (빨강 쪽 x = W - x - w).
window.MAPS = window.MAPS || {};
MAPS.snow = {
  name: '눈 덮인 설원', desc: '얼음 계단 · 넓은 설원',
  plats: (W, G) => { const C = W / 2; return [
    { x: C - 130, w: 260, y: G - 220, center: true },       // 얼음 봉우리 = 얼음 용 둥지
    { x: C - 270, w: 180, y: G - 115 }, { x: C + 90, w: 180, y: G - 115 }, // 봉우리 아래 40px 겹침
    { x: 900, w: 220, y: G - 110 }, { x: W - 1120, w: 220, y: G - 110 },
    { x: 1560, w: 160, y: G - 120 }, { x: W - 1720, w: 160, y: G - 120 }]; },
  baseX: 230,
  towerSlots: [[560, true], [880, false], [1220, true], [1560, false]],
  obstacles: (W) => [[1300, 'crate'], [1880, 'rock'], [W - 1300, 'crate'], [W - 1880, 'rock']],
  obstStats: { rock: { w: 62, h: 48, hp: 260 }, crate: { w: 50, h: 50, hp: 160 } },
  teamElem: ['water', 'rock'],    // 파랑 = 물방울(얼음물), 빨강 = 바위 정령(언 땅)
  dragon: 'ice', dragonName: '얼음 용',
  dragonBuff: { spd: 1.15, jump: 1.15, slowHit: 0.8, desc: '공격 시 적 둔화 · 이동속도 강화' },
  dragonFx: { glow: 0xc8f0ff, breath: [0xe8faff, 0xa8e0ff, 0x70c0ff, 0xffffff], color: '#c8f0ff' },
  sky: 0x9cc8e8,
  theme: {
    sky: 0x9cc8e8, fog: 0xdcecf8, fogNear: 30, fogFar: 105,
    hemi: [0xeaf4ff, 0x8aa0c0, 0.95], sun: 0xe8f0ff, sunDisc: 0xf4f8ff, sunY: 14,
    ground: 0xf2f6fc, dirt: 0x8a96a8, edge: 0xffffff, path: 0xdce8f4,
    tufts: [0xffffff, 0xcfe4f4, 0x6a8a6a],
    hills: [0xe4eef8, 0xcadcee, 0xb0c8e0], hillShape: 'peaks', trees: 'pine', treeColor: 0x2f6a52,
    clouds: 0xf4f8ff, cloudOpacity: 0.85, snow: true, ice: true,
    plat: { side: 0x7a8aa0, top: 0xf4f8ff, rim: 0xffffff, under: 0x9ab8d8 },
    rock: [0xa8d8f0, 0xd0f0ff, 0xffffff], rockIce: true, crate: [0x9a7048, 0x60442c], crateSnow: true,
    lair: { rock: 0x6a90b8, rock2: 0x9ac0e0, top: 0xc8e0f4, glow: 0x80d8ff, haze: 0xa8e8ff, ember: [0xffffff, 0xd0f0ff, 0xa0e0ff], emberG: 0.3, crystal: true },
  },
};
