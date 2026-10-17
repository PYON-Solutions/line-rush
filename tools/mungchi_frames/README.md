# 뭉치 프레임 애니메이션 빌드 (AI 영상 → WebP 아틀라스)
작업 폴더 `W=/workspace/mungchi_fx`: 마젠타 배경 측면(오른쪽 보기) 영상 `src/mungchi_<action>.mp4` → `raw*/NNN.png`
1. `python3 keycache.py` — 크로마키(../dandan_frames/key.py `key()`, fix_edges 안 씀) + 작은 떨어진 조각 제거, 640x480(turn)은 16:9로 패딩 후 1280x720 → `$W/out/keyed/<dir>/`
2. `python3 build.py` — 동작별 프레임 선택(표 `A`). 클립마다 001(기본 서 있는 자세) 기준 스케일: 서 있는 키 TH=250px, 발바닥=앵커 y, 머리 중심=앵커 x
   (큰 캐릭터 영상 raw/raw_idle/raw_atk2/raw_s2 와 작은 캐릭터 영상(0.62배)이 같은 크기·같은 발 위치가 됨). footnorm: 영상 점프 높이 제거(높이는 게임 코드), headc: turn 머리 고정
3. `Q=78 python3 pack.py` — 2048 아틀라스 WebP + mungchi.json → `$W/out/pack/` → `characters/mungchi/frames/` 로 복사
4. `python3 sheet.py out.png [acts] [scale]` — 동작별 프레임 시트 (빨간 십자 = 앵커)
게임 쪽: `characters/common/frames.js`, `js/heroes2d.js`(updateFrameHero + mungUpdate/mungKeyFx), `characters/mungchi/rig.js`(MUNG.frames). VFX 는 단단 영상 이펙트(characters/dandan/fx) 공유 + 금빛 틴트
- skill1 쿵 내려찍기: 공중 프레임은 게임 vy로 선택, 착지(doSlam) 순간 key 프레임
- ult 곰 돌진: h.dash 동안 ultrun 루프 → game.js ultSmash(돌진 끝 0.16초 뒤 흔들림·히트스톱) 시점에 ultfin key
- 미리보기 캡처: /workspace/mungchi_fx/test/cap.py → mkprev.py
