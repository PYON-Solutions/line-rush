// 영웅 레지스트리: 여기 등록된 영웅을 뷰어와 게임이 불러옴
import MUNG from './mungchi/rig.js';
import PIYO from './piyo/rig.js';
import MOMO from './momo/rig.js';
import {loadAll} from './common/index.js';
export const HEROES={mungchi:MUNG,piyo:PIYO,momo:MOMO};
// 게임 데이터 키 -> 캐릭터 폴더
export const GAME_KEY={bear:'mungchi',chick:'piyo',cat:'momo'};
export function loadHeroes(keys=Object.keys(HEROES)){return loadAll([].concat(...keys.map(k=>HEROES[k].files)))}
export * from './common/index.js';
