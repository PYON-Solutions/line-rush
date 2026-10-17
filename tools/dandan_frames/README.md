# 단단 프레임 애니메이션 빌드 (AI 영상 → WebP 아틀라스)
원본: 마젠타 배경 측면(오른쪽 보기) 영상 `dandan_<action>.mp4`, 검은 배경 VFX `fx_<name>.mp4` (작업 폴더 /workspace/dandan_fx)
1. `ffmpeg -i src/X.mp4 raw/X/%03d.png` 로 프레임 추출
2. `python3 build.py` — 동작별 프레임 선택(표 `A`), 크로마키(key.py: 거리+마젠타 알파, 가장자리 언믹스, YUV 번짐 빨간 테두리 제거), 공통 크롭 박스/앵커(발 기준선 y=377, 몸 중심 x=300, 0.69배)
3. `Q=76 python3 pack.py` — 트림된 프레임을 2048 아틀라스(WebP)+JSON으로 → `characters/dandan/frames/`
4. `Q=62 python3 fx.py` — VFX 시트(휘도 알파) → `characters/dandan/fx/`
5. `python3 sheet_all.py out.png` — 동작별 프레임 시트
게임 쪽: `characters/common/frames.js`(재생기·스프라이트·VFX), `js/heroes2d.js`(updateFrameHero 상태 머신), `characters/dandan/rig.js`(DAN.frames)
미리보기 영상: `preview_capture.py`(가상 시계로 30fps 결정적 캡처, 로컬 서버 127.0.0.1:8642) → `preview_encode.py`
