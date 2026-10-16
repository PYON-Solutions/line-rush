// 맵 선택: ?map=<이름> 이 최우선, 없으면 로비에서 고른 맵(localStorage lr_map), 기본 meadow
// 맵 목록 순서 = 로비 캐러셀 순서
(function () {
  const M = window.MAPS;
  M.meadow.theme = M.meadow.theme || {}; M.meadow.desc = M.meadow.desc || '기본 라인 · 높은 중앙 발판';
  // 초원: 붉은 불꽃 용은 화산으로 옮기고, 초원은 초록 숲의 용 + 이끼·나뭇잎 둥지
  Object.assign(M.meadow, { dragon: 'forest', dragonName: '숲의 용', dragonBuff: { spd: 1.25, jump: 1.15, desc: '이동속도 · 점프 강화' },
    dragonFx: { glow: 0xb8ffc8, breath: [0xd8ffb0, 0x90e070, 0x50c060, 0xffffff], color: '#c8ffd0' } });
  M.meadow.theme.lair = M.meadow.theme.lair || { rock: 0x5a6a48, rock2: 0x7a8a5a, top: 0x4f8a3e, glow: 0x9aff7a, haze: 0x9aff9a, ember: [0xc8ff90, 0x80e060, 0xffffa0], emberG: -0.2, leaf: true };
  window.MAP_ORDER = ['meadow', 'canyon', 'volcano', 'snow'].filter(k => M[k]);
  let saved = null; try { saved = JSON.parse(localStorage.getItem('lr_map')); } catch (e) {}
  const q = new URLSearchParams(location.search).get('map');
  window.MAP_KEY = M[q] ? q : M[saved] ? saved : 'meadow';
  window.MAP = M[window.MAP_KEY];
  window.setMap = k => { if (!M[k]) return; window.MAP_KEY = k; window.MAP = M[k]; try { localStorage.setItem('lr_map', JSON.stringify(k)); } catch (e) {}
    if (window.R3D && R3D.setMap) R3D.setMap(M[k]); };
})();
