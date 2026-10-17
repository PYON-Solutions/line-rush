// 영웅 레지스트리: 여기 등록된 영웅을 뷰어와 게임이 불러옴
import MUNG from './mungchi/rig.js';
import PIYO from './piyo/rig.js';
import MOMO from './momo/rig.js';
import DAN from './dandan/rig.js';
import SAL from './salang/rig.js';
import TOTO from './toto/rig.js';
import {loadAll} from './common/index.js';
export const HEROES={mungchi:MUNG,piyo:PIYO,momo:MOMO,dandan:DAN,salang:SAL,toto:TOTO};
// 게임 데이터 키 -> 캐릭터 폴더
export const GAME_KEY={bear:'mungchi',chick:'piyo',cat:'momo',turtle:'dandan',fox:'salang',rabbit:'toto'};
export function loadHeroes(keys=Object.keys(HEROES)){return loadAll([].concat(...keys.map(k=>HEROES[k].files)))}
export * from './common/index.js';
