import { createRenderer, assetsReady } from './render3d.js';
import './announce.js';
await assetsReady;

const body = document.body;
window.R3D = createRenderer(body);

// Load classic game.js after R3D is ready
const s = document.createElement('script');
s.src = 'js/game.js';
s.onerror = (e) => console.error('game.js failed', e);
// 로비/영웅 선택 화면 (js/lobby.js) 은 game.js 다음에
s.onload = () => { const l = document.createElement('script'); l.src = 'js/lobby.js'; document.body.appendChild(l); };
document.body.appendChild(s);
