# minions/ — 미니언
- `water/ rock/ fire/` : 원소별 2D 스프라이트 `tier0.png`(근접) `tier1.png`(원거리) `tier2.png`(공성·보스). 처치 시 팝 이펙트에 사용.
- `model.js` : 게임 화면의 3D 미니언 모델 (`makeMinion(원소, tier, 팀)`).
- 팀별 원소는 맵에서 정함 (`maps/meadow.js`의 `teamElem`, 기본: 파랑=water, 빨강=fire).
- 능력치(체력·공격·사거리·속도)는 `js/data.js`의 `MINIONS`, 이동/전투 행동은 엔진 `js/game.js`.
