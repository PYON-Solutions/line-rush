# maps/ — 맵
- `meadow.js` : 기본 맵 "초원 라인". 발판, 기지 위치, 타워 슬롯, 장애물(상자/바위), 팀별 미니언 원소, 드래곤 종류, 하늘색.
- 새 맵: 파일을 복사해 `MAPS.<이름> = {...}` 로 정의하고 `index.html`에 `<script>` 추가, `?map=<이름>` 으로 선택.
- 월드 길이·지면 높이(`WORLD_W`, `GROUND`)는 `js/data.js`. 3D 배경(언덕·구름·나무)은 `js/render3d.js`.

## 맵 목록 (로비 영웅 선택 화면의 맵 캐러셀 · `?map=` 으로도 선택, 마지막 선택은 localStorage `lr_map`)
| 키 | 이름 | 용 (dragons/) | 용 버프 | 미니언 (파랑/빨강) |
|---|---|---|---|---|
| `meadow` | 초원 라인 | `forest` 숲의 용 | 이동속도·점프 | water / fire |
| `canyon` | 모래 협곡 | `sand` 모래 용 | 받는 피해 -15% · 이동 | rock / fire |
| `volcano` | 화산 | `dragon` 불꽃 용 (기본 붉은 용) | 영웅 공격력 +12% · 이동 | water / fire |
| `snow` | 눈 덮인 설원 | `ice` 얼음 용 | 공격 시 둔화 · 이동·점프 | water / rock |
- `select.js` : 맵 순서(`MAP_ORDER`), 현재 맵 결정, `setMap(키)` (로비에서 호출 → 3D 배경 다시 만듦). 초원 용/둥지 설정도 여기.
- 맵의 `theme` = 3D 배경 (하늘 그라데이션·안개·조명, 땅 색, 언덕 모양 `round|mesa|peaks|volcano`, 나무 `round|cactus|pine|deadtree`, `snow`/`ash` 날씨, `lava` 용암 강, `ice` 얼음판·고드름, 발판/바위/상자 색, `lair` 둥지 색). 그리는 쪽은 `js/render3d.js` buildTheme.
- `dragonBuff` = { spd, jump, dr(받는 피해 감소), atk(영웅 공격력), slowHit(초), desc }. `dragonFx` = 용 빛/입김 색.
- 발판은 반드시 좌우 대칭(빨강 = `W - x - w`), 높이 차 ≤ 110px (점프 최고 ≈ 124px).
