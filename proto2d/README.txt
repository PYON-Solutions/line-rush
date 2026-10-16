라인 러쉬 2D 캐릭터 프로토타입

- index.html : 캐릭터 조립/애니메이션 코드 전부 (HTML+JS 한 파일). 브라우저로 열면 바로 실행됩니다.
  로컬에서는 폴더에서 `python3 -m http.server 8080` 실행 후 http://localhost:8080/ 로 여세요 (파일 직접 열기는 이미지 로딩이 막힐 수 있음).
- img2d/mungchi, img2d/piyo, img2d/momo : 캐릭터별 그림 조각(PNG, 투명 배경)
  - assembled.png : 원본 완성 그림
  - img2d/piyo/parts/ + pivots.json : 삐요 팔 조각과 관절 위치
  - img2d/piyo/side/ : 옆모습 시도(현재 미사용)
- img2d/SKIN_SLOTS.md : 스킨용 조각 이름 규칙
- concept/ : 원본 컨셉 그림
- 조작: 방향키 이동, 스페이스 점프, Z/X/C/V 공격·스킬, 화면 위 버튼으로 캐릭터 전환

Spine/DragonBones 같은 툴에서 쓰려면 img2d 안의 조각 PNG를 가져가서 관절을 다시 잡으면 됩니다.
