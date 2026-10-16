# towers/ — 타워
- 그림: `arrow_lv1~3`(화살탑 1~3레벨, 레벨마다 쇠뇌가 늘어남), `rapid`(연사), `cannon`(대포) × `_blue` / `_red`. rapid·cannon 그림은 왼쪽을 겨누므로 파랑팀은 자동 좌우 반전.
- `sprite.js` : 패널 표시. 은은한 대기 흔들림, 발사 시 반동 + 총구 섬광(게임의 `shotSeq` 신호), 피격 흔들림, 업그레이드 시 반짝임, 파괴 시 가라앉으며 무너짐 + 파편/먼지.
- 섬광 위치는 `sprite.js`의 `MUZZLE` 표에서 조정.
- 능력치·비용은 `js/data.js`의 `TOWER`, 설치 위치(슬롯)는 `maps/meadow.js`의 `towerSlots`.
