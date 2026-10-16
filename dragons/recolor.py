# 붉은 용(화산) 그림을 색만 바꿔 맵별 용(숲/모래/얼음)을 만든다: python3 dragons/recolor.py
import numpy as np, colorsys, shutil, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
VAR = { # 이름: (목표 색조°, 채도 배율, 밝기 배율+, 크림(배) 색조 이동)
  'sand': (34, 0.62, 1.12),
  'ice':  (198, 0.70, 1.30),
  'forest': (112, 0.72, 1.05),
}
def recolor(src, dst, hue, sm, vm):
  a = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32) / 255
  rgb = a[..., :3]; mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn + 1e-6
  r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
  h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
  s = np.where(mx > 0, d / (mx + 1e-6), 0); v = mx
  red = ((h < 45) | (h > 330)) & (s > 0.38)
  # 원래 빨강(0°)~주황(40°) 차이를 살려 목표 색조 주변에 퍼뜨림
  off = np.where(h > 180, h - 360, h)
  nh = np.where(red, (hue + off * 0.5) % 360, h)
  ns = np.where(red, np.clip(s * sm, 0, 1), s)
  nv = np.where(red, np.clip(v * vm + (0.08 if vm > 1.2 else 0), 0, 1), v)
  if vm > 1.2:  # 얼음: 크림색 배·뿔은 푸른 흰색으로
    cream = (~red) & (s < 0.45) & (v > 0.5)
    nh = np.where(cream, 205, nh); ns = np.where(cream, s * 0.45, ns); nv = np.where(cream, np.clip(v * 1.06, 0, 1), nv)
  c = nv * ns; hp = nh / 60; x = c * (1 - np.abs(hp % 2 - 1)); m = nv - c
  z = np.zeros_like(c); i = hp.astype(int) % 6
  R = np.choose(i, [c, x, z, z, x, c]); G = np.choose(i, [x, c, c, x, z, z]); B = np.choose(i, [z, z, x, c, c, x])
  out = np.stack([R + m, G + m, B + m, a[..., 3]], -1)
  Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(dst, optimize=True)
for n, (hue, sm, vm) in VAR.items():
  os.makedirs(f'{D}/{n}_rig', exist_ok=True)
  recolor(f'{D}/dragon_rig/atlas.png', f'{D}/{n}_rig/atlas.png', hue, sm, vm)
  shutil.copy(f'{D}/dragon_rig/rig.json', f'{D}/{n}_rig/rig.json')
  recolor(f'{D}/dragon.png', f'{D}/{n}.png', hue, sm, vm)
