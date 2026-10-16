// 맵 정의: 모래 협곡 — 따뜻한 모래, 메사(탁상 바위산), 선인장, 노을 하늘. 모래 용(받는 피해 감소 버프)
// 발판은 모두 좌우 대칭 (빨강 쪽 x = W - x - w). 점프 최고 높이 ≈ 124px 이므로 발판 사이 높이 차는 110 이하.
window.MAPS = window.MAPS || {};
MAPS.canyon = {
  name: '모래 협곡', desc: '메사 사이 좁은 협곡 · 높은 바위 턱',
  plats: (W, G) => { const C = W / 2; return [
    { x: C - 160, w: 320, y: G - 205, center: true },        // 중앙 메사 = 모래 용 둥지
    { x: C - 520, w: 200, y: G - 105 }, { x: C + 320, w: 200, y: G - 105 }, // 메사로 오르는 바위 턱
    { x: 960, w: 190, y: G - 100 }, { x: W - 1150, w: 190, y: G - 100 },    // 라인 중간 바위 턱
    { x: 1270, w: 150, y: G - 195 }, { x: W - 1420, w: 150, y: G - 195 }]; }, // 높은 저격 턱
  baseX: 230,
  towerSlots: [[560, true], [880, false], [1220, true], [1560, false]],
  obstacles: (W) => [[1400, 'rock'], [1720, 'crate'], [W - 1400, 'rock'], [W - 1720, 'crate']],
  obstStats: { rock: { w: 62, h: 48, hp: 260 }, crate: { w: 50, h: 50, hp: 160 } },
  teamElem: ['rock', 'fire'],     // 파랑 = 바위 정령(대지), 빨강 = 불씨(사막의 열기)
  dragon: 'sand', dragonName: '모래 용',
  dragonBuff: { spd: 1.15, jump: 1.1, dr: 0.15, desc: '받는 피해 15% 감소 · 이동속도 강화' },
  dragonFx: { glow: 0xffd28a, breath: [0xffe0a0, 0xe0b070, 0xc89050, 0xffffff], color: '#ffd9a0' },
  sky: 0xf2a65e,
  theme: {
    sky: 0xf2a65e, skyTop: 0x6a4a8c, fog: 0xf0b88a, fogNear: 35, fogFar: 110,
    hemi: [0xffe0b8, 0xb07040, 0.9], sun: 0xffc080, sunDisc: 0xffd890, sunY: 7,
    ground: 0xe0b06c, dirt: 0xb0703c, edge: 0xf0c888, path: 0xd8a460,
    tufts: [0xc8a060, 0x9aa050, 0xd89060],
    hills: [0xd88a52, 0xc8784a, 0xa86a5a], hillShape: 'mesa', trees: 'cactus', treeColor: 0x5f9a4a,
    clouds: 0xffd8c0, cloudOpacity: 0.75,
    plat: { side: 0xb0703c, top: 0xe0b06c, rim: 0xf4d090, under: 0x9a5e34 },
    rock: [0xc88a58, 0xe0a870, 0xb07040], crate: [0xa8743e, 0x6a4424],
    lair: { rock: 0x8a5a38, rock2: 0xa8744a, top: 0x9a6a40, glow: 0xffb040, haze: 0xffc070, ember: [0xffd080, 0xe8b060, 0xfff0c0], emberG: -0.4 },
  },
};
