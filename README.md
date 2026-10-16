# 라인 러쉬 (Line Rush)
모바일 가로 화면 웹 게임 — https://pyon-solutions.github.io/line-rush/ (캐릭터 뷰어: `/characters/viewer.html`)

## 폴더 구조
| 폴더 | 내용 |
|---|---|
| `characters/` | 영웅(뭉치·삐요·모모) 2D 퍼펫: 파츠 PNG + `rig.js`(뼈대·동작), `common/`(엔진·IK·이펙트), `viewer.html`. **게임이 여기서 영웅을 불러옴** |
| `minions/` | 미니언 `water/ rock/ fire/` 페인팅 그림 + `sprite.js`(통통 걷기·공격·피격·사망 팝) |
| `towers/` | 화살탑 1~3레벨, 연사(rapid), 대포(cannon) 그림 + `sprite.js`(반동·섬광·붕괴) |
| `bases/` | 기지 5단계 (파랑/빨강) 그림 + `sprite.js`(흔들림·업그레이드 반짝임) |
| `dragons/` | 드래곤 그림 + `sprite.js` |
| `maps/` | 맵 정의 (발판, 기지/타워 위치, 장애물, 팀별 미니언 원소, 드래곤, 하늘색) |
| `ui/` | 앱 아이콘 등 UI 리소스 |
| `js/` | 엔진 코어 (`game.js` 로직·HUD, `render3d.js` Three.js 렌더러, `heroes2d.js` 퍼펫 연결, `data.js` **밸런스 숫자 전체**, `assets.js` 스프라이트 경로표) |
| `vendor/` | three.js |
| `legacy/` | 사용하지 않는 예전 3D 모델 (영웅·미니언·타워·기지·드래곤) |

화면 스타일: 배경·발판은 3D, 영웅·미니언·건물·드래곤은 모두 2D 페인팅 패널. 각 폴더의 `README.md`에 자세한 설명이 있습니다. 밸런스 숫자는 모두 `js/data.js`에 있고, 배치(위치)는 `maps/`에 있습니다.

## 로컬 실행
`python3 -m http.server` 후 http://localhost:8000/ (`?auto` = 자동 플레이, `?speed=4` = 배속, `?map=meadow`)

## 조작 / 규칙 (v5)
- 이동: 조이스틱 · ←→/AD, 점프: ↑/W/Space, 스킬: 1·2·3 (J K L)
- **대시** (Shift / G, 쿨 16초) · **귀환** (B, 4초 채널 — 피격/이동 시 취소) · **점수판** (Tab 또는 '점수' 버튼)
- 상점(P)은 **우리 기지 근처에서만** 열림. 기지에서는 HP 20%/초, MP 30%/초 회복.
- 영웅 최대 레벨 20, 궁극기는 Lv.6 해금, Lv.11·16에 강화(★). 레벨업마다 크기 최대 +15%, Lv.15+ 팀 색 불꽃 오라.
- 스킬은 마나 소모 (영웅별 `mana` 값, `js/data.js`). 레벨 곡선·마나·귀환·대시 수치는 모두 `js/data.js` 상단 상수.
- **스킬 해제**: 스킬1 Lv.1 · 스킬2 Lv.3 · 궁극기 Lv.6 (Lv.11·16 강화). 모든 스킬은 레벨에 따라 피해·범위(최대 1.5배)·군중제어 시간(최대 1.5초)이 커짐 (`SKILL_SCALE`).
- 스킬2: 뭉치 꿀 방패(피해 35% 감소) · 삐요 끈끈이 덫(밟으면 피해+둔화, 최대 2개) · 모모 속박 마법진(0.7초 후 범위 속박). 이동기는 공용 대시가 담당.
- 영웅은 바라보는 방향의 적만 공격하고, 공격하는 순간 잠깐 멈칫(이동 25%) — 뒷걸음질 사격 없음.
- 디버그: `?auto` `?speed=N` `?dragon=초` `?lv=N`
- 중앙 플랫폼 용 둥지 연출: `dragons/lair.js`

## 밸런스 시뮬레이터 (tools/)
- `node tools/sim.js 100 out.json --jobs=8 --log=sim.log` — 실제 게임 로직/AI로 AI vs AI 전 조합 헤드리스 대전 (수치 무변경, 측정 전용)
- `python3 tools/analyze.py out.json outdir` — 승률·진영·레벨·K/D 요약 + 승률 히트맵 (matplotlib 필요)
