// 맵 정의: 초원 라인 (기본 맵)
// 좌표는 게임 단위(px). W = WORLD_W, G = GROUND (js/data.js). 빨강 팀 쪽은 W - x 로 대칭.
const MAPS = window.MAPS || (window.MAPS = {});
MAPS.meadow = {
  name: '초원 라인',
  // 발판: center:true 인 발판 위에 드래곤이 등장
  plats: (W, G) => { const C = W / 2; return [
    { x: C - 140, w: 280, y: G - 215, center: true }, { x: C - 470, w: 220, y: G - 110 }, { x: C + 250, w: 220, y: G - 110 },
    { x: 1050, w: 200, y: G - 115 }, { x: W - 1250, w: 200, y: G - 115 }]; },
  baseX: 230,                                             // 기지 위치 (팀0 기준, 팀1은 W-x)
  towerSlots: [[560, true], [880, false], [1220, true], [1560, false]], // [x, 비어있음?] 팀0 기준
  // 장애물: type 'crate'|'rock'
  obstacles: (W) => [[1380, 'crate'], [1850, 'rock'], [W - 1380, 'crate'], [W - 1850, 'rock']],
  obstStats: { rock: { w: 62, h: 48, hp: 260 }, crate: { w: 50, h: 50, hp: 160 } },
  teamElem: ['water', 'fire'],   // 팀별 미니언 원소 (minions/<원소>/)
  dragon: 'dragon',              // dragons/ 의 드래곤 종류
  sky: 0x7ec8f0,                 // 3D 배경 하늘색
};
window.MAP = MAPS[new URLSearchParams(location.search).get('map')] || MAPS.meadow;
