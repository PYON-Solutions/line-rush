// 라인 러쉬 - 밸런스 데이터
const WORLD_W = 4400, VIEW_H = 450, GROUND = 382;
const HEROES = {
  bear: { name:'뭉치', role:'곰 전사 · 근접', img:'h_bear', color:'#c98a4b',
    hp:1050, hpL:100, atk:72, atkL:8, range:80, as:0.85, spd:210, armor:0.15, proj:null, lifesteal:0.15,
    skills:[
      {name:'쿵 내려찍기', cd:8, desc:'점프 후 내려찍어 주변 기절'},
      {name:'꿀 방패', cd:14, desc:'3초간 받는 피해 50% 감소'},
      {name:'곰 돌진', cd:40, desc:'앞으로 돌진하며 적을 밀쳐냄'}]},
  chick:{ name:'삐요', role:'병아리 궁수 · 원거리', img:'h_chick', color:'#f2c230',
    hp:640, hpL:66, atk:54, atkL:6, range:300, as:0.7, spd:215, armor:0, proj:'arrow',
    skills:[
      {name:'삼연발', cd:6, desc:'화살 3발을 부채꼴로 발사'},
      {name:'날개 대시', cd:10, desc:'뒤로 폴짝 뛰어 거리 벌리기'},
      {name:'화살비', cd:45, desc:'넓은 지역에 화살비'}]},
  cat:  { name:'모모', role:'고양이 마법사 · 마법', img:'h_cat', color:'#8b8fd8',
    hp:600, hpL:62, atk:60, atkL:7, range:265, as:1.0, spd:205, armor:0, proj:'orb',
    skills:[
      {name:'얼음 냥펀치', cd:7, desc:'얼음 구체로 피해+둔화'},
      {name:'순간이동', cd:12, desc:'앞/위로 순간이동'},
      {name:'별똥별', cd:50, desc:'거대한 별을 떨어뜨림'}]},
};
const LEVEL_XP = [0,100,240,420,640,900,1200,1550,1950,2400]; // 레벨 1~10 누적 경험치
const MINIONS = { // blue=물방울, red=불씨
  melee: { hp:290, atk:18, range:42, as:1.0, spd:62, gold:20, xp:32, h:40, img:0 },
  ranged:{ hp:190, atk:24, range:210, as:1.3, spd:62, gold:16, xp:28, h:50, img:1 },
  siege: { hp:950, atk:55, range:340, as:2.0, spd:52, gold:55, xp:70, h:78, img:2, structMul:2 },
  boss:  { hp:2600,atk:85, range:70, as:1.4, spd:48, gold:120,xp:150,h:105,img:2, structMul:2.5 },
};
const BASE = { hp:[2800,3500,4300,5200,6400], cost:[0,350,650,950,1350], wave:[24,22,20,18,16],
  names:['초가집','나무집','돌집','성','동물 왕국 성'], rockDmg:65, rockRange:360, rockCd:1.6 };
const TOWER = { cost:[150,200,300,400], hp:[1000,1250,1500,1800], dmg:[45,45,45], range:310, cd:1.0,
  rapid:{dmg:24, cd:0.22, minionMul:1.6}, cannon:{dmg:130, cd:2.2, aoe:95, heroMul:1.3} };
const ECON = { start:300, passive:3, heroKill:260, towerKill:150, crate:25, dragonGold:150 };
const SHOP = { weapon:[200,300,400,550,700], skill:[250,350,500] };
const HERO_STRUCT_MUL = 2.0, EXPOSED_BASE_MUL = 1.5, MINION_VS_HERO = 0.5, TOWER_VS_MINION = 0.6, HERO_MINION_MUL = 1.8, MINION_VS_MINION = 1.6, RUSH_TIME = 120; // 2:00 이후 '라인 러쉬 타임' (미니언 강화)
const DRAGON = { hp:1600, first:90, every:90, buff:60, atk:45 };
