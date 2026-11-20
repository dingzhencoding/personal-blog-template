# BrandWord (左上角动态字) Specification

## Overview
- **Source:** https://yihanglizi.cn/ header, `BrandName` Vue component (`.ba`, scope `data-v-cf82e59d`)
- **Target:** every header `.VPNavBarTitle .template-brand-name` (home markup, `shared/nav.html`, and the captured about/friends/tools markups)
- **Enhancer:** `src/components/sites/yihanglizi-cn-bc4c2f76/root-8a5edab2/brand.ts`, mounted from `ClientEnhancements.tsx` (home) and `shared/PageEnhancements.tsx` (all other routes)
- **Screenshots:** `docs/design-references/yihanglizi-cn-bc4c2f76/root-8a5edab2/live-header-{1440,768,390}.png`
- **Interaction model:** time-driven auto loop (no click/hover); static when `prefers-reduced-motion: reduce`

## Word mapping (site identity, starlight blog)
Original cycle: `一行栗子` → `栗子一行` → `李一行` → back.
Cloned cycle: `栗子一行` (4, accent 栗) → `星河夜航` (4, accent 夜 @ index 2) → `夜航星` (3, accent 星 @ index 2) → back.
The split char morphs 夜 → 星, and the MID tail 夜航 becomes the SHORT head, so the merge reads as a slide plus a new star.

## DOM Structure
```
span.template-brand-name
  span.ba.ba--sm[data-v-cf82e59d] (aria-label = current phrase)
    span.ba-row
      span.ba-slot (x4)  style="--sx:i;opacity:1;transform:scale(1)"
        span.ba-char.ba-char--morph|normal[.ba-char--scramble]
    span.ba-particles (only while particles run)
      span.ba-particle (x6, absolute, random left/delay/duration)
```
During the split phases the accent slot instead contains:
```
span.ba-split
  span.ba-split-half.ba-split--top[.ba-split--fly|.ba-split--fly-back] > span.ba-char.ba-char--morph
  span.ba-split-half.ba-split--btm > span.ba-char.ba-char--morph.ba-char--shift
```

## Computed Styles (live, getComputedStyle)
- `.ba`: inline-flex, position relative, align-center, padding 1px 3px, radius 8px, overflow hidden, cursor pointer, user-select none, margin-left 4px; tokens `--ba-ink:#e6dccb; --ba-accent:#ffb000; --ba-accent-2:#ffd24a; --ba-glow:rgba(255,176,0,.35)`
- `.ba-row`: flex row, align-center, gap 1px, overflow hidden, z-index 1
- `.ba-slot` (sm): 20 x 24 px, flex center, overflow hidden, transition opacity .35s / transform .35s cubic-bezier(.16,1,.3,1)
- `.ba-slot--hidden`: width 0, opacity 0, overflow hidden, margin 0
- `.ba-char`: font-weight 900, line-height 1, transition color .4s
- `.ba-char--normal`: 16px, color var(--ba-ink), letter-spacing 1px
- `.ba-char--morph` / `--li`: 17px, color var(--ba-accent), text-shadow 0 0 12px var(--ba-glow)
- `.ba-char--scramble`: color var(--ba-accent-2), same glow
- `.ba-split`: absolute inset 0; top half height 47%, bottom top 47% height 53%, bottom char offset top calc(-47%/53%*100%)
- `.ba-particle`: 2x2 px (sm), radius 50%, background var(--ba-accent), animation particle-fly-sm .6s ease-out forwards

## Animation Timeline (from live source, exact values)
1. `initial` — show 栗子一行, hold 2600ms
2. `shuffle` — scramble all 4 chars for 400ms (random char every 50ms from pool), set 星河夜航, wait 150ms
3. `showSf` — hold 2000ms
4. `split` — accent slot swaps to split halves; after 80ms add fly-left (sm: .6s) + spawn 6 particles; 700ms total
5. `merge` — remove split, set 夜航星 (slot 4 opacity 0), 500ms → `showLi` 1800ms
6. `bounce` — slots get slot-bounce-sm (.8s, delays 0/.12/.24s), 1000ms
7. `showLi` — 500ms
8. `unmerge` — split accent (星) again, add fly-right (sm: .55s) + particles, 700ms
9. `return` — restore 星河夜航 all 4 slots, 500ms, then hold 1000ms
10. `unshuffle` — scramble all 400ms, set 栗子一行, 150ms → loop

Scramble char pool (verbatim): `的一是不了在有人我他这为之来以个们到说时要出会可也对生能子得下大自还后没然看起天开面理心头所经气如样水用十两`

Particles: 6 per burst; sm left = (20 + random*160) * 0.25 px (≈5–40px), delay 0–0.3s, duration 0.4–0.9s.

## Keyframes (from captured theme-source.css)
- `slot-bounce-sm`: 0% ty0 s1; 25% ty-6px s1.06; 45% ty0 s.95; 60% ty-2.5 s1.02; 75% ty0 s.98; 100% ty0 s1
- `fly-left-sm`: 0% translate(0) rotate(0) opacity 1; 30% .9; 100% translate(-25px) rotate(-12deg) opacity 0
- `fly-right-sm`: 0% translate(-25px) rotate(-12deg) opacity 0; 60% opacity .85 translate(-1px) rotate(1deg); 100% translate(0) rotate(0) opacity 1
- `particle-fly-sm`: 0% ty0 s1 opacity .9; 100% ty-13px s0 opacity 0

## Assets
None (text only). Uses already-captured CSS in `src/styles/theme-source.css`; theme build keeps `.ba*` rules once the classes/scope appear in home markup + brand.ts.

## Responsive Behavior
- Live uses `ba--sm` at every viewport (fixed 20x24 slots, 16/17px chars); only the rest of the header collapses.
- Desktop clone: wrapper previously 1.42rem; ba--sm keeps 89px-wide 4-char block, close to prior brand width.
- Mobile 390px: unchanged ba--sm sizes; 3-char phase shrinks row by one 21px slot.

## Reduced motion
Show `栗子一行` statically, no loop, no particles.