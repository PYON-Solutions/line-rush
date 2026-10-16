# js/ — 엔진 코어
- `game.js` : 게임 로직(매치, 영웅/미니언 AI, 전투, HUD, 메뉴). `data.js` : **밸런스 숫자 전체** (영웅·미니언·타워·기지·드래곤·경제).
- `render3d.js` : Three.js 2.5D 렌더러, `models.js` : 공통 3D 도형 키트 + 맵 소품, `heroes2d.js` : characters/ 퍼펫 ↔ 게임 연결.
- `assets.js` : 2D 스프라이트 이름 → 폴더 경로 표, `bootstrap.js` : 로딩 순서, `fullscreen.js` : 전체화면·가로 고정.
