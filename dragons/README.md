# dragons/ — 드래곤
- 맵별 용: `dragon`(붉은 불꽃 용, 화산) · `forest`(초원) · `sand`(모래 협곡) · `ice`(설원). 색만 바꾼 그림/리그는 `python3 dragons/recolor.py` 로 다시 만듦.
- `dragon.png` (붉은 새끼 용, 오른쪽을 봄, 예전 그림은 `legacy/art_v1/`) + `sprite.js` : 둥실 떠오름, 날갯짓 스쿼시, 방향 반전, 피격 번쩍, 처치 시 파티클.
- 맵의 `dragon` 값이 파일 이름 (`dragons/<이름>.png`). 체력·등장 시간·버프는 `js/data.js`의 `DRAGON`.
- 드래곤이 근처에 있으면 카메라가 살짝 올라가고 뒤로 빠져 높은 발판 위 드래곤이 보이게 함 (`js/render3d.js` setCamera). 디버그: `?dragon=20` (20초에 첫 등장).
- `lair.js` — 중앙 플랫폼 용 둥지(현무암 바위, 용암 균열, 불씨, 붉은 안개)

- 부위 리그: `dragons/dragon_rig/` (자르기 `minions/rig_cut.py`, 설정 `minions/rig_specs.py`). 날개 퍼덕임·꼬리 휨·머리 끄덕임, 공격 시 몸째 앞으로 + 입 벌려 불똥. `?rig=0`이면 예전 한 장 그림. 뷰어: `minions/viewer.html?only=dragon`.
