# Chalkline Studio — Clipart Library Style Guide

## 1. Objective & Aesthetics
Create clean, expressive, and friendly whiteboard doodles designed specifically for stroke-by-stroke hand drawing.
- **Medium**: Felt-tip whiteboard marker line art with soft, flat color fills beneath.
- **Tone**: Warm, approachable, slightly whimsical cartoon style (approachable educational and explainer style).
- **Proportions**:
  - Characters are approximately ~3 heads tall (chibi/stylized cartoon proportions).
  - Heads are distinct with expressive dot eyes, simple eyebrows, and friendly curved mouths.
  - Feet stand firmly near the bottom baseline (`y ≈ 183`).

## 2. Canvas & Coordinates
- **ViewBox**: `0 0 200 200`
- **Safe Drawing Zone**: `15` to `185` on both X and Y axes. All strokes and fills must stay strictly inside `[15, 15, 185, 185]`.
- **Centering**: All standalone props, objects, and shapes should be visually centered around `(100, 100)`. Characters center horizontally around `x = 100` and vertically from `y ≈ 24` (head) down to `y ≈ 183` (feet).

## 3. Stroke Rules (The Hand Drawing Order)
The drawing hand executes strokes sequentially from first to last:
1. **Command Syntax**:
   - Every single stroke must be an absolute path starting with `M` (e.g. `M100,24 Q...`).
   - Only absolute SVG commands are permitted: `M`, `L`, `C`, `Q`, `A`, `Z`.
   - No relative commands (`m`, `l`, etc.), no `<g>`, no transforms, no `style` attributes.
   - Coordinates rounded to 1 decimal place.
2. **Stroke Count**:
   - Between **8 and 60 strokes** per item.
3. **Stroke Length**:
   - Total measured stroke length must be between **600 and 9,000 units**.
4. **Drawing Sequence**:
   - Mimic the exact natural order an artist draws on a whiteboard:
     1. Main silhouette / outer boundary.
     2. Primary structural features (e.g., face oval, torso, limbs, main prop body).
     3. Secondary features (eyes, nose, mouth, collar, pockets, buttons, wheels).
     4. Interior accents, texture hatching, or ground lines last.

## 4. Fill Rules (Color Underlay)
- **Fills Count**: Between **2 and 10 fills** per item.
- **Color Format**: Exact 6-digit hex codes (`#RRGGBB`).
- **Closure**: Every fill path must be completely closed (`Z` at the end).
- **Placement**: Fills sit under the line work. Fill contours should cleanly match the inner boundaries of the strokes.
- **Palette**:
  - **Skin Tones**: Varied respectfully across characters:
    - Fair: `#F6D3B7`
    - Warm Tan: `#E2B48C`
    - Rich Brown: `#B97F55`
    - Deep Brown: `#8A5636`
  - **Accent Colors**: Clear, harmonious markers:
    - Warm Red: `#E4572E`, Coral: `#D9576B`
    - Sky Blue: `#7EC8E3`, Deep Blue: `#3D7DCA`
    - Teal/Green: `#2E8B78`, Mint: `#A3E4D7`
    - Sunflower Yellow: `#F2B544`, Gold: `#E3B04B`
    - Lavender/Purple: `#8B5FBF`

## 5. Cultural & Ethical Respect Guidelines
- **Cultural Dress**: Accurately and respectfully depict shalwar kameez, kurta, dupatta, hijab, waistcoat, sari, and suits.
- **Faith Items**:
  - Never depict prophets, angels, or holy figures.
  - Never include Arabic, Quranic, or Biblical text (show clean blank horizontal lines to represent writing).
  - Treat all sacred symbols (mosques, churches, lanterns, prayer mats) with utmost dignity and visual purity.
- **No IP/Copyright**: No corporate logos, brand trademarks, copyrighted characters, or real celebrities.
