import { createRenderer, assetsReady } from './render3d.js';
import './announce.js';
await assetsReady;

const body = document.body;
window.R3D = createRenderer(body);

// Load classic game.js after R3D is ready
const s = document.createElement('script');
s.src = 'js/game.js';
s.onerror = (e) => console.error('game.js failed', e);
document.body.appendChild(s);
