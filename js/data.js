// 라인 러쉬 - 밸런스 데이터
const WORLD_W = 4400, VIEW_H = 450, GROUND = 382;
const HEROES = {
  bear: { name:'뭉치', role:'곰 전사 · 근접', img:'h_bear', color:'#c98a4b',
    hp:900, hpL:58, atk:66, atkL:5, mana:[45,60,140], range:80, as:0.85, spd:210, armor:0.10, proj:null, lifesteal:0.05,
    skills:[
      {name:'쿵 내려찍기', cd:10, desc:'점프 후 내려찍어 주변 기절 (레벨에 따라 범위·기절 증가)'},
      {name:'꿀 방패', cd:14, desc:'3초간 받는 피해 35% 감소'},
      {name:'곰 돌진', cd:40, desc:'앞으로 돌진하며 적을 밀쳐냄'}]},
  chick:{ name:'삐요', role:'병아리 궁수 · 원거리', img:'h_chick', color:'#f2c230',
    hp:720, hpL:52, atk:62, atkL:4, mana:[40,50,140], range:300, as:0.7, spd:215, armor:0, proj:'arrow',
    skills:[
      {name:'삼연발', cd:6, desc:'화살 3발을 부채꼴로 발사'},
      {name:'끈끈이 덫', cd:12, desc:'바닥에 덫 설치 — 밟은 적에게 피해 + 둔화'},
      {name:'화살비', cd:45, desc:'넓은 지역에 화살비'}]},
  cat:  { name:'모모', role:'고양이 마법사 · 마법', img:'h_cat', color:'#8b8fd8',
    hp:700, hpL:50, atk:70, atkL:4.4, mana:[50,60,140], range:265, as:1.0, spd:205, armor:0, proj:'orb',
    skills:[
      {name:'얼음 냥펀치', cd:7, desc:'얼음 구체로 피해+둔화'},
      {name:'속박 마법진', cd:13, desc:'잠시 후 마법진 안의 적을 묶음 (이동 불가)'},
      {name:'별똥별', cd:50, desc:'거대한 별을 떨어뜨림'}]},
};
// 영웅 레벨 1~20: LEVEL_XP[n] = 레벨 n+1 이 되는 누적 경험치 (구간 = 100 + 40×(n-1))
const MAX_LV = 20;
const LEVEL_XP = (() => { const a=[0]; for (let n=1;n<MAX_LV;n++) a.push(a[n-1] + 100 + 40*(n-1)); return a; })();
const ULT_LV = 6, ULT_UP = [11, 16], SKILL_LV = [1, 3, 6]; // 스킬 해제 레벨 (1·2·궁)      // 궁극기 해제 레벨, 궁극기 강화 레벨 (각 +30%)
const LV_SKILL = 0.045;                    // 레벨당 스킬 피해 +4.5%
// 스킬 레벨 성장: 범위 ×(1+rad·k), 군중제어 ×(1+cc·k), k=(레벨-1)/19. 상한: 범위 1.5배, 군중제어 1.5초
const SKILL_SCALE = { rad:0.5, radCap:1.5, cc:1.2, ccCap:1.5 };
const SHIELD_DR = 0.35;                    // 꿀 방패 피해 감소율
// 마나: 최대치 = base + perLv×(레벨-1). 라인에서는 천천히, 기지 근처에서는 빠르게 회복
const MANA = { base:150, perLv:12, regen:1.4, regenIdle:4, baseRegenPct:0.30 };
const RECALL = { time:4, baseZone:300, baseHealPct:0.20 };  // 귀환 채널링(초), 기지 구역 반경(px), 기지 회복(초당 최대치 비율)
const DASH = { cd:16, dist:190 };          // 공용 대시 (점멸)
const MINIONS = { // blue=물방울, red=불씨
  melee: { hp:290, atk:18, range:42, as:1.0, spd:62, gold:20, xp:32, h:40, img:0 },
  ranged:{ hp:190, atk:24, range:210, as:1.3, spd:62, gold:16, xp:28, h:50, img:1 },
  siege: { hp:950, atk:55, range:340, as:2.0, spd:52, gold:55, xp:70, h:78, img:2, structMul:2 },
  boss:  { hp:2600,atk:85, range:70, as:1.4, spd:48, gold:120,xp:150,h:105,img:2, structMul:2.5 },
};
const BASE = { hp:[2200,2700,3300,4000,4900], cost:[0,350,650,950,1350], wave:[24,22,20,18,16],
  names:['초가집','나무집','돌집','성','동물 왕국 성'], rockDmg:65, rockRange:360, rockCd:1.6 };
const TOWER = { cost:[150,200,300,400], hp:[800,1000,1200,1450], dmg:[45,45,45], range:310, cd:1.0,
  ruin:150, rapid:{dmg:24, cd:0.22, minionMul:1.6}, cannon:{dmg:130, cd:2.2, aoe:95, heroMul:1.3} };
const ECON = { start:300, passive:3, heroKill:260, towerKill:150, crate:25, dragonGold:150 };
const SHOP = { weapon:[200,300,400,550,700], skill:[250,350,500] };
const HERO_STRUCT_MUL = 4.0, EXPOSED_BASE_MUL = 2.5, MINION_VS_HERO = 0.5, TOWER_VS_MINION = 0.45, HERO_MINION_MUL = 1.8, MINION_VS_MINION = 1.6, RUSH_TIME = 150; // 2:00 이후 '라인 러쉬 타임' (미니언 강화)
const RESPAWN = { base:4, perLv:2.2 };  // 부활 시간 = base + 레벨×perLv (초)
const RUSH_STRUCT = 1.6;  // 러쉬 타임 이후 분당 미니언 건물 피해 증가율
const DRAGON = { hp:1600, first:90, every:90, buff:60, atk:45 };
