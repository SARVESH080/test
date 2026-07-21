# Design notes

**Concept:** "a study at dusk, not a coffee shop." Kindle/Play Books references
skew toward warm-cream-and-terracotta or flat white Material defaults — this
platform's chrome (library, nav, settings) leans into a quieter, ink-and-brass
library feel, while the *reading surface itself* stays neutral and configurable
(that's what the brief's theme system is for).

**Palette**
- `--ink-900 #161C24` — primary dark surface (nav, library background in dark mode)
- `--ink-700 #232B36` — card surfaces on dark
- `--linen-100 #EDEAE1` — light-mode chrome background (muted, not the cliché cream)
- `--brass-500 #B8863B` — single accent: progress rings, active states, links
- `--moss-600 #3F5D4E` — secondary accent: success/favorite states
- `--ink-50 #F7F5F0` — light text-on-dark surfaces

Reading-surface themes (independent of chrome theme, per the brief):
- Light: `#FBFAF6` bg / `#1C1C1A` text
- Sepia: `#F1E7D0` bg / `#3B2F20` text
- Dark: `#1B1E22` bg / `#D8D8D4` text
- AMOLED: `#000000` bg / `#C9C9C9` text

**Type**
- Display / book titles: `Fraunces` (serif with real character, used at large
  sizes only — headings, book titles on cards)
- UI chrome: `Inter` (labels, buttons, metadata)
- Reading body copy: `Source Serif 4` (falls back to Georgia) — set larger,
  wider line-height, optimized purely for long-form reading

**Signature element — "the shelf"**
Book grids sit on a hairline rule with a soft downward shadow under each row,
evoking a physical shelf ledge rather than a floating card grid. Cover art
gets a subtle spine-edge shadow on its left side. It's the one recurring
motif; everything else stays quiet so it doesn't compete with book covers,
which are already the most visually loud element on the page.

**Motion**
Minimal and functional: cards lift 2px on hover, the reader settings panel
slides in from the right, page-load stagger on the library grid (Framer
Motion). No ambient/decorative animation — this is a focus app.
