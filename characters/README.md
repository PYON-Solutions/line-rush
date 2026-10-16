# characters/ — 영웅 캐릭터 폴더

게임과 뷰어가 **이 폴더에서 직접** 영웅을 불러옵니다. 여기 PNG나 `rig.js`를 고치면 게임 속 영웅이 그대로 바뀝니다.

## 구조
```
characters/
  index.js            영웅 등록부 (HEROES, 게임 키 bear/chick/cat → 폴더 매핑, loadHeroes)
  viewer.html         캐릭터 뷰어 (영웅 전환, 동작 버튼, 키보드 ←→ 스페이스 z x c v)
  SKIN_SLOTS.md       스킨 파츠 슬롯 규칙 (영문 상세)
  common/
    core.js           캔버스 대상·월드 상태, 수학/이징, 이미지 로더, 파츠 그리기 D()
    ik.js             2본 IK(solve2), 벡터 회전
    effects.js        월드 이펙트 (링, 플래시, 스파크, 별, 먼지, 휘두르기 궤적)
    puppet.js         캐릭터 엔진 (상태, 기본 포즈 idle/run/jump, 스프링, 업데이트, 그리기)
  mungchi/  뭉치 (곰 전사, 망치)   rig.js + 파츠 PNG + portrait_blue/red.png(HUD 초상화)
  piyo/     삐요 (병아리 궁수, 활) rig.js + 파츠 PNG + parts/(팔 슬롯, pivots.json)
  momo/     모모 (고양이 마법사, 지팡이) rig.js + 파츠 PNG
```
`assembled.png`와 `concept/`(원화 시트)는 참고용입니다 (게임에서 사용하지 않음).

## rig.js 안에 있는 것
- `P` : 파츠 표. `{f:'폴더/파일명(확장자 없이)', p:[피벗x,피벗y], s:크기}` — 파일을 바꾸거나 피벗/크기를 조정
- `arm`, `leg` : 관절 위치 (어깨, 팔꿈치, 손목, 엉덩이, 무릎, 발목)
- `rest` : 대기 자세, `Tc/stride/lift` : 달리기 주기·보폭·발 높이
- `drawOrder` : 파츠 그리는 순서 (앞/뒤 팔·다리)
- `acts` : 동작. `basic`(기본공격), `skill1`, `skill2`, `ult` — 게임의 실제 공격/스킬 1·2·궁극기에 연결됨

## 스킨 바꾸기 (슬롯 규칙)
1. 같은 **파일 이름(슬롯)** 으로 PNG를 덮어쓰면 끝 (예: `mungchi/helmet.png`, `piyo/bow_body.png`).
2. 투명 배경 RGBA, 왼쪽 위 조명, 2px 정도 진한 외곽선.
3. 팔다리 파츠는 **세로로** 그림: 위쪽 = 부모 관절(피벗), 아래쪽 = 자식 관절. 겹치는 부분은 둥글게 여유 있게.
4. 그림 크기나 관절 위치가 달라지면 `rig.js`의 `P`(피벗 `p`, 크기 `s`)와 `arm/leg` 값을 조정.
5. 다른 스킨을 통째로 만들려면 폴더를 복사(`mungchi_gold/` 등)하고 `rig.js`의 `f:` 경로 접두사를 바꾼 뒤 `index.js`에 등록.
자세한 슬롯 목록은 `SKIN_SLOTS.md` 참고.

## 편집하고 확인하기
- `characters/viewer.html` 을 열고(로컬: `python3 -m http.server` 후 http://localhost:8000/characters/viewer.html) 영웅·동작 버튼으로 확인.
  URL 옵션: `?hero=piyo`, `?act=skill1&t=0.5`(정지 프레임), `?lineup=1`, `?scale=1.3`
- 게임 연결 코드는 `js/heroes2d.js` : 영웅마다 384×384 캔버스에 퍼펫을 그리고 3D 장면에 판(평면)으로 배치합니다.
  팀 색은 발밑 링(파랑/빨강), 피격 시 흰색 번쩍임, 기절 시 별이 돕니다.
- 게임 안에서는 동작의 위치 이동(돌진, 대시, 순간이동)과 화살/오브 발사는 게임 로직이 담당하므로 퍼펫은 자세만 보여줍니다 (`GAME` 플래그).
- 새 동작을 추가하면 `acts.<이름>`을 만들고, 게임에서 쓰려면 `js/game.js`에서 `h.animAct='<이름>'; h.animSeq++` 로 트리거.
