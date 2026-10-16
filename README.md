# 라인 러쉬 (Line Rush)
모바일 가로 화면 웹 게임 — https://pyon-solutions.github.io/line-rush/ (캐릭터 뷰어: `/characters/viewer.html`)

## 폴더 구조
| 폴더 | 내용 |
|---|---|
| `characters/` | 영웅(뭉치·삐요·모모) 2D 퍼펫: 파츠 PNG + `rig.js`(뼈대·동작), `common/`(엔진·IK·이펙트), `viewer.html`. **게임이 여기서 영웅을 불러옴** |
| `minions/` | 미니언 `water/ rock/ fire/` 스프라이트 + 3D 모델 `model.js` |
| `towers/` | 화살탑 1~3레벨, 연사(rapid), 대포(cannon) 스프라이트 + `model.js` |
| `bases/` | 기지 5단계 (파랑/빨강) + `model.js` |
| `dragons/` | 드래곤 스프라이트 + `model.js` |
| `maps/` | 맵 정의 (발판, 기지/타워 위치, 장애물, 팀별 미니언 원소, 드래곤, 하늘색) |
| `ui/` | 앱 아이콘 등 UI 리소스 |
| `js/` | 엔진 코어 (`game.js` 로직·HUD, `render3d.js` Three.js 렌더러, `heroes2d.js` 퍼펫 연결, `data.js` **밸런스 숫자 전체**, `assets.js` 스프라이트 경로표) |
| `vendor/` | three.js |
| `legacy/` | 사용하지 않는 예전 3D 영웅 모델 |

각 폴더의 `README.md`에 자세한 설명이 있습니다. 밸런스 숫자는 모두 `js/data.js`에 있고, 배치(위치)는 `maps/`에 있습니다.

## 로컬 실행
`python3 -m http.server` 후 http://localhost:8000/ (`?auto` = 자동 플레이, `?speed=4` = 배속, `?map=meadow`)
