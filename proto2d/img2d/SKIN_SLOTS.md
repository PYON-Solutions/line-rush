# Skin part slots (prototype: proto2d.html)

A skin is a folder of PNGs with the same slot names and a `pivots.json` file. To reskin, replace the folder and keep the slot names.

    img2d/<hero>/parts/<slot>.png
    img2d/<hero>/parts/pivots.json

## Image rules
- Transparent RGBA. Each part is painted **vertical**: the parent joint is at the top and the child joint is at the bottom.
- `pivot`: the parent joint in image px. The part rotates around this point.
- `end`: the child joint in image px. The bone is length-fitted from pivot to end, so overlap past `end` is kept. Paint generous rounded overlap at both ends.
- `grip` (hands): the point that lands on the IK target (the bow handle or the string).
- Unit: see `pivots.json` (`scale`). Piyo parts are cut from the painted sheet at half resolution. proto2d draws them at about s=.5–.56. The sleeve stretches along its bone, clamped to ±25%. The forearm is anchored at the wrist and is not stretched freely, so it never becomes a long tube; the sleeve bell covers the elbow overlap.
- Draw order in a limb (idle/run): forearm → hand → sleeve → shoulder cap. Draw pose: the sleeve goes behind the torso (the elbow sits behind the back), then cap → forearm → sleeve-end patch at the elbow → pull hand. Upper sleeve: recoloured to the tunic green and its flare narrowed by 28%.
- Light from the top left, dark outline about 2 px, no baked shadows on the background.

## Piyo slots
| slot | use |
|---|---|
| shoulder | Shoulder cap. Pivot is at the bottom rim and sits on the sleeve top at the shoulder joint; it rotates by 50% of the upper-arm angle so it always caps the sleeve. Recoloured to the tunic green (62,107,39) |
| upper | Tapered sleeve, from shoulder to elbow |
| forearm | Yellow forearm with a brown leather cuff, from elbow to wrist |
| hand_relaxed | Idle/run free hand |
| hand_pull | String-pull pinch fist. `grip` sits on the nock |
| hand_grip_back | Bow fist, drawn **behind** the bow handle |
| hand_grip_front | Finger band and thumb tip, drawn **in front of** the handle (the arrow goes on top) |

Far arm: `far_shoulder`, `far_upper`, `far_forearm` (copies from the sheet's bottom row) are drawn with a dark tint (`D(part,.14)`).

Cutting: `/workspace/cut_arms.py` flood-fills from the white border, takes connected components, builds soft alpha with white decontamination (no halos), adds a 3 px dark outline to match the game art, trims the forearm's feather tuft, removes the grip stick and rotates the grip 90° so the bow runs horizontally through `grip`.

## Code
`PIYO.P` maps each slot to `{f:'piyo/parts/<slot>', p:pivot, s:scale, len:end.y-pivot.y}`. `PIYO.seg(part,A,B)` draws a bone from A to B. `PIYO.limb(S,E,H,hand)` draws shoulder + upper + forearm + hand.

Near shoulder pivot = centre of the torso art's armhole (torso.png px ~[32,60] → local [-31,-82]). The cap pivot is the dome centre, so the cap covers the armhole; its rotation is 50% of the upper-arm angle, clamped to ±0.5 rad, so it stays dome-up.

## Piyo side-profile rig (current) — img2d/piyo/side/
Pieces are cut from the side-profile sheet by `/workspace/cut_side.py`: flood-fill from white, alpha cleanup with white decontamination, a 3 px dark outline, and the hat feather recoloured to yellow. Images are stored at half the sheet resolution and drawn at s=.84 (`PK`).
Limb pieces are rotated so the bone runs straight down: `pivot` = parent joint, `end` = child joint (see pivots.json). Arms are split at the elbow with rounded overlap ends; legs are split at the knee and ankle.

| slot | notes |
|---|---|
| head | pivot = neck (drawn ×1.22 for chibi proportion) |
| torso | pivot = hem centre; extra points: neck, shF (armhole = near shoulder), shB, hipF, hipB |
| upper / forearm / hand | near arm (sleeve dome includes the shoulder cap). upper is drawn ×1.3 lengthwise |
| hand_pull | string-pinch fist; pivot = string point, drawn unrotated |
| far_upper / far_forearm / far_hand | far (bow) arm, drawn tinted ×1.2 behind the torso. The bow fist = far_hand behind the handle plus a clipped finger band in front |
| thigh / shin / boot, far_* | legs; boot `sole` = ground contact below the ankle |
| wing | back wing (flipped, tinted); front wing only during wing dash |
| bow | pivot = grip; tipT/tipB = string nocks |

The near arm uses analytic 2-bone IK (`ik2`) with the real bone lengths. The forearm stretch is clamped to 0.9–1.1×.
The old 3/4 rig is kept in /workspace/proto2d_v14_oldrig_backup.html, with its parts in img2d/piyo/parts/.
