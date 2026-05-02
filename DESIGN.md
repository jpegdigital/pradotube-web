---
name: Tutti Frutti Character Select
colors:
  surface: "#E093FF"
  surface-dim: "#B597FF"
  surface-bright: "#FFB1CE"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "rgba(255,255,255,0.85)"
  surface-container: "rgba(255,255,255,0.65)"
  surface-container-high: "rgba(255,255,255,0.45)"
  surface-container-highest: "rgba(255,255,255,0.20)"
  on-surface: "#FFFFFF"
  on-surface-variant: "rgba(255,255,255,0.78)"
  inverse-surface: "#FFFFFF"
  inverse-on-surface: "#1A1530"
  outline: "rgba(255,255,255,0.45)"
  outline-variant: "rgba(255,255,255,0.20)"
  surface-tint: "#CE82FF"

  primary: "#58CC02"
  on-primary: "#FFFFFF"
  primary-container: "#89E219"
  on-primary-container: "#1B1B1B"
  inverse-primary: "#89E219"

  secondary: "#1CB0F6"
  on-secondary: "#FFFFFF"
  secondary-container: "#55CCFF"
  on-secondary-container: "#0A2A40"

  tertiary: "#CE82FF"
  on-tertiary: "#FFFFFF"
  tertiary-container: "#D9A6FF"
  on-tertiary-container: "#3D1A50"

  error: "#FF4B4B"
  on-error: "#FFFFFF"
  error-container: "#FF6B6B"
  on-error-container: "#5A0000"

  background: "#E093FF"
  on-background: "#FFFFFF"
  surface-variant: "rgba(255,255,255,0.20)"

  rainbow-coral: "#FF4B4B"
  rainbow-peach: "#FF9600"
  rainbow-sunflower: "#FFC800"
  rainbow-mint: "#58CC02"
  rainbow-mint-light: "#89E219"
  rainbow-teal: "#00CD9C"
  rainbow-sky: "#1CB0F6"
  rainbow-lavender: "#CE82FF"
  rainbow-magenta: "#FF66B5"

  gradient-light-1: "#FFB1CE"
  gradient-light-2: "#FF9ED9"
  gradient-light-3: "#E093FF"
  gradient-light-4: "#B597FF"
  gradient-light-5: "#8FB6FF"

  gradient-dark-1: "#4B1E55"
  gradient-dark-2: "#5A1B6E"
  gradient-dark-3: "#3F1D78"
  gradient-dark-4: "#2A2080"
  gradient-dark-5: "#1F2A6B"

  blob-pink: "#FF6B9D"
  blob-pink-deep: "#FF4D7E"
  blob-magenta: "#FF66B5"
  blob-magenta-soft: "#FF8AC9"
  blob-lavender: "#C56BFF"
  blob-lavender-deep: "#9D4EFF"
  blob-indigo: "#8E7AFF"
  blob-indigo-deep: "#6C5BFF"
  blob-soft-pink: "#FFC1E0"
  blob-soft-pink-warm: "#FFA0D2"

  ink-deep: "#1A1530"
  ink-shadow: "rgba(40,18,70,0.12)"
  ink-shadow-soft: "rgba(60,25,100,0.18)"

typography:
  display-balloon:
    fontFamily: Fredoka
    fontSize: "clamp(2.75rem, 9vw, 6rem)"
    fontWeight: "700"
    lineHeight: "1.05"
    letterSpacing: "-0.015em"
  display-lg:
    fontFamily: Fredoka
    fontSize: 64px
    fontWeight: "700"
    lineHeight: 68px
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: Fredoka
    fontSize: 40px
    fontWeight: "700"
    lineHeight: 48px
    letterSpacing: "-0.015em"
  headline-md:
    fontFamily: Fredoka
    fontSize: 28px
    fontWeight: "600"
    lineHeight: 36px
    letterSpacing: "-0.01em"
  title-lg:
    fontFamily: Fredoka
    fontSize: 20px
    fontWeight: "700"
    lineHeight: 28px
  label-card:
    fontFamily: Fredoka
    fontSize: 18px
    fontWeight: "700"
    lineHeight: 22px
    letterSpacing: "-0.005em"
  body-lg:
    fontFamily: Nunito
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-md:
    fontFamily: Nunito
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-sm:
    fontFamily: Nunito
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-sm:
    fontFamily: Nunito
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: "0.04em"

rounded:
  none: "0"
  sm: "0.45rem"
  DEFAULT: "0.75rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
  3xl: "1.65rem"
  4xl: "1.95rem"
  pill: "9999px"
  circle: "50%"
  blob: "58% 42% 56% 44% / 52% 60% 40% 48%"
  blob-alt: "42% 58% 38% 62% / 60% 38% 62% 40%"

spacing:
  unit: 4px
  micro: 8px
  xs: 12px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  hero-padding-y: 80px
  hero-padding-y-mobile: 48px
  page-padding-x: 24px
  page-padding-x-desktop: 64px
  avatar-grid-gap-x: 48px
  avatar-grid-gap-y: 48px
  card-padding: 20px

elevation:
  sticker-flat:
    description: "Hard-edged offset shadow that gives balloon text a printed-sticker feel"
    value: "drop-shadow(0 6px 0 rgba(40,18,70,0.12))"
  sticker-cushion:
    description: "Soft diffused indigo glow stacked under sticker-flat to suggest paper lift"
    value: "drop-shadow(0 14px 28px rgba(60,25,100,0.18))"
  sticker-lift-combined:
    description: "Composite drop-shadow filter applied to the balloon heading wrapper"
    value: "drop-shadow(0 6px 0 rgba(40,18,70,0.12)) drop-shadow(0 14px 28px rgba(60,25,100,0.18))"
  avatar-ring-glow:
    description: "Halo emitted from a hovered avatar ring, tinted by its rainbow stops"
    value: "0 0 24px rgba(255,75,75,0.40), 0 0 48px rgba(255,150,0,0.20)"
  card-resting:
    value: "0 4px 12px rgba(60,25,100,0.10)"
  card-elevated:
    value: "0 12px 28px rgba(60,25,100,0.18)"
  label-text-shadow:
    description: "Soft white cushion under deep-ink creator labels for legibility on gradient"
    value: "0 2px 0 rgba(255,255,255,0.45)"
  footer-text-shadow:
    description: "Indigo-tinted shadow on small footer text to hold contrast across gradient stops"
    value: "0 1px 4px rgba(50,20,80,0.25)"

motion:
  duration-fast: 200ms
  duration-base: 350ms
  duration-slow: 800ms
  ease-bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)"
  ease-smooth: "cubic-bezier(0.4, 0, 0.2, 1)"
  ease-natural: "ease-in-out"
  blob-morph-duration: 22s
  blob-morph-duration-max: 30s
  balloon-bob-duration: 4s
  ring-breathe-duration: 4s
  ring-breathe-offset: 2s
  ring-shimmer-duration: 2s
  word-bob-amplitude: 6px
  word-bob-stagger: "-0.4s"
  ring-hover-scale: "1.12"
  ring-breathe-scale: "1.03"

opacity:
  blob-light: "0.65"
  blob-dark: "0.45"
  grain: "0.018"
  footer-text: "0.78"
  outline-divider: "0.18"

border-width:
  hairline: "1px"
  ring-resting: "4px"
  ring-resting-mobile: "3px"
  text-stroke-headline-min: "3px"
  text-stroke-headline-max: "7px"
  text-stroke-headline-fluid: "clamp(3px, 0.55vw, 7px)"
  text-stroke-label: "2px"

components:
  gradient-canvas:
    backgroundImage: "linear-gradient(140deg, {colors.gradient-light-1} 0%, {colors.gradient-light-2} 22%, {colors.gradient-light-3} 50%, {colors.gradient-light-4} 78%, {colors.gradient-light-5} 100%)"
    backgroundAttachment: fixed
    minHeight: "100vh"
  gradient-canvas-dark:
    backgroundImage: "linear-gradient(140deg, {colors.gradient-dark-1} 0%, {colors.gradient-dark-2} 25%, {colors.gradient-dark-3} 55%, {colors.gradient-dark-4} 80%, {colors.gradient-dark-5} 100%)"
    backgroundAttachment: fixed
  organic-blob:
    position: absolute
    pointerEvents: none
    filter: "blur(32px)"
    opacity: "{opacity.blob-light}"
    borderRadius: "{rounded.blob}"
    willChange: "transform, border-radius"
    animation: "blob-morph {motion.blob-morph-duration} ease-in-out infinite"
  organic-blob-pink:
    backgroundImage: "radial-gradient(circle at 35% 35%, {colors.blob-pink} 0%, {colors.blob-pink-deep} 60%, transparent 75%)"
    width: 540px
    height: 480px
  organic-blob-lavender:
    backgroundImage: "radial-gradient(circle at 60% 40%, {colors.blob-lavender} 0%, {colors.blob-lavender-deep} 60%, transparent 75%)"
    width: 460px
    height: 520px
    animationDelay: "-7s"
  organic-blob-magenta:
    backgroundImage: "radial-gradient(circle at 50% 50%, {colors.blob-magenta-soft} 0%, {colors.blob-magenta} 60%, transparent 75%)"
    width: 420px
    height: 380px
    animationDelay: "-13s"
  organic-blob-indigo:
    backgroundImage: "radial-gradient(circle at 45% 55%, {colors.blob-indigo} 0%, {colors.blob-indigo-deep} 60%, transparent 75%)"
    width: 380px
    height: 440px
    animationDelay: "-4s"
  organic-blob-soft-pink:
    backgroundImage: "radial-gradient(circle at 50% 50%, {colors.blob-soft-pink} 0%, {colors.blob-soft-pink-warm} 55%, transparent 75%)"
    width: 320px
    height: 320px
    animationDelay: "-10s"
  balloon-heading:
    fontFamily: "{typography.display-balloon.fontFamily}"
    fontSize: "{typography.display-balloon.fontSize}"
    fontWeight: "{typography.display-balloon.fontWeight}"
    lineHeight: "{typography.display-balloon.lineHeight}"
    letterSpacing: "{typography.display-balloon.letterSpacing}"
    textAlign: center
    filter: "{elevation.sticker-lift-combined}"
  balloon-word:
    display: inline-block
    textStrokeWidth: "{border-width.text-stroke-headline-fluid}"
    textStrokeColor: "#FFFFFF"
    paintOrder: "stroke fill"
    margin: "0 clamp(0.15rem, 0.6vw, 0.5rem)"
    animation: "balloon-bob {motion.balloon-bob-duration} ease-in-out infinite"
  balloon-word-coral:
    color: "{colors.rainbow-coral}"
    transform: "rotate(-2.5deg)"
  balloon-word-peach:
    color: "{colors.rainbow-peach}"
    transform: "rotate(1.5deg)"
  balloon-word-sunflower:
    color: "{colors.rainbow-sunflower}"
    transform: "rotate(-1deg)"
  balloon-word-mint:
    color: "{colors.rainbow-mint}"
    transform: "rotate(2deg)"
  balloon-word-sky:
    color: "{colors.rainbow-sky}"
    transform: "rotate(-1.5deg)"
  balloon-word-lavender:
    color: "{colors.rainbow-lavender}"
    transform: "rotate(1.5deg)"
  avatar-ring:
    borderRadius: "{rounded.circle}"
    padding: "{border-width.ring-resting}"
    backgroundSize: "200% 200%"
    transition: "transform {motion.duration-base} {motion.ease-bounce}, box-shadow {motion.duration-base} {motion.ease-smooth}"
  avatar-ring-hover:
    transform: "scale({motion.ring-hover-scale})"
    boxShadow: "{elevation.avatar-ring-glow}"
    animation: "ring-shimmer {motion.ring-shimmer-duration} linear infinite"
  avatar-clip:
    width: "100%"
    height: "100%"
    borderRadius: "{rounded.circle}"
    overflow: hidden
    backgroundColor: "{colors.surface-container-lowest}"
  creator-label:
    fontFamily: "{typography.label-card.fontFamily}"
    fontSize: "{typography.label-card.fontSize}"
    fontWeight: "{typography.label-card.fontWeight}"
    color: "{colors.ink-deep}"
    textStrokeWidth: "{border-width.text-stroke-label}"
    textStrokeColor: "rgba(255,255,255,0.65)"
    paintOrder: "stroke fill"
    textShadow: "{elevation.label-text-shadow}"
    textAlign: center
  creator-label-dark:
    color: "{colors.surface-container-lowest}"
    textStrokeColor: "rgba(0,0,0,0.55)"
    textShadow: "0 2px 0 rgba(0,0,0,0.35)"
  header-on-gradient:
    backgroundColor: transparent
    backdropFilter: none
    borderBottomColor: transparent
    color: "{colors.on-surface}"
  footer-on-gradient:
    color: "{colors.on-surface-variant}"
    textShadow: "{elevation.footer-text-shadow}"
    borderTopColor: "rgba(255,255,255,{opacity.outline-divider})"
    typography: "{typography.label-sm}"
  grain-overlay:
    position: fixed
    inset: 0
    zIndex: 1
    opacity: "{opacity.grain}"
    pointerEvents: none
    backgroundImage: "fractalNoise SVG (256x256, baseFrequency 0.9, 4 octaves, stitched)"
    backgroundRepeat: repeat
    backgroundSize: "256px 256px"
  button-pill-primary:
    backgroundColor: "{colors.primary}"
    color: "{colors.on-primary}"
    typography: "{typography.label-card}"
    rounded: "{rounded.pill}"
    height: 48px
    padding: "0 24px"
    boxShadow: "{elevation.card-resting}"
  button-pill-ghost:
    backgroundColor: transparent
    color: "{colors.on-surface}"
    typography: "{typography.label-card}"
    rounded: "{rounded.pill}"
    height: 40px
    padding: "0 16px"
---

## Brand & Style

This design system is the visual identity of a kid-friendly streaming home — a "character select" screen that asks *Who do you want to watch?* and answers it with circular creator portraits arranged like a roster of friends. The brand personality is **playful, confident, and unmistakably for children**, drawing on Duolingo-ABC visual cues (chunky letterforms, bold saturated colors, bouncy motion) without slipping into infantile territory.

The defining gesture is **stickered balloon typography on an alive background**. The headline is not a styled string of text but a row of independently-colored, white-outlined word-stickers, each tilted slightly off-axis and bobbing on its own delay. The background is never a solid color — it is a saturated pink→magenta→indigo gradient with five organic, low-blur blobs of higher-saturation color drifting and morphing through it. Together these create a feeling of motion and warmth that feels designed-by-hand, not generated.

The emotional target is *delight without chaos*: bold maximalism in palette and typography, but disciplined in spacing, geometry, and motion timing. A child should feel invited; an adult should recognize craft.

## Colors

The color system rejects the pastel-on-white tendency of generic kid software. **Saturation is the brand.** Three layers stack to produce depth:

1. **The Canvas** — a 5-stop diagonal linear gradient running from soft pink in the upper-left to indigo-blue in the lower-right. The gradient is applied to the document body with `background-attachment: fixed`, so the header, page content, and footer all sit on one continuous field. There is no white surface anywhere on this screen.
2. **The Blobs** — five absolutely-positioned organic shapes (irregular `border-radius`), each with a radial-gradient fill in a single saturated hue (pink, magenta, lavender, indigo, soft-pink). They are blurred at 32px and held at 65% opacity so they read as *atmosphere* rather than illustration.
3. **The Stickers** — foreground elements (headline words, avatar rings, creator labels) use the full Duolingo-rainbow palette at 100% saturation, separated from the gradient by white outlines.

For dark mode ("movie night"), the gradient shifts to a deep magenta→indigo→midnight palette while the blob colors stay unchanged at lower opacity, preserving the same composition with reduced luminance. Text labels invert from deep-ink purple-black to white with a dark stroke.

Semantic roles:
- **Primary** is Duolingo mint green `#58CC02` — used for affirmative CTAs, focus rings, and the "watch" word slot in the headline rotation.
- **Error** is `#FF4B4B` — also used as the coral tone for the first headline word.
- **Tertiary** is lavender `#CE82FF` — also used for the closing headline word.

Every accent in the rainbow palette has a defined role on this screen, so introducing a new color requires a deliberate addition to the palette rather than ad-hoc tinting.

## Typography

Two families, each with a precise role:
- **Fredoka** — Display & UI text. A friendly, rounded sans-serif with generous counters and soft terminals. Used at all weights from 400 (rare) to 800; default visible weight is 700.
- **Nunito** — Body, captions, and footer. A neutral-but-warm geometric sans that pairs with Fredoka without competing.

The hero treatment, called **Balloon Type**, is the signature of this system:

- Each word of the headline is rendered in its own inline span and assigned a different rainbow color.
- A thick white outline is applied via `-webkit-text-stroke` with `paint-order: stroke fill`, so the stroke sits *behind* the fill rather than thinning it.
- Stroke width scales fluidly: `clamp(3px, 0.55vw, 7px)`.
- Each word is rotated between -2.5° and +2° on a per-word basis so the line reads like hand-placed stickers.
- Each word also bobs vertically by 6px on a 4-second sine, with staggered delays so no two words peak simultaneously.
- Two stacked drop-shadows on the wrapper (a flat indigo offset + a soft diffused indigo cushion) produce a tactile lift without a rectangular box-shadow.

Smaller labels (creator names) reuse the same outlined-text technique at reduced stroke (2px) and inverted color (deep-ink purple-black `#1A1530` over a softer white outline). This consistency ties decorative type and functional type into one language.

Body text **never** uses outlines. Only headline-class elements take the balloon treatment, which prevents stylistic exhaustion.

## Layout & Spacing

The screen composes as three vertical bands with deliberate negative space:

1. A transparent header bar (logo, primary nav, account)
2. The hero — headline at top, avatar grid centered below
3. A whisper-quiet footer line ("curated with care")

- An **8px base grid** governs spacing decisions, but the grid is interpreted loosely — the avatar row tolerates `48px` horizontal gap at desktop because density-versus-airiness is the primary tension on this screen.
- The avatar grid uses `flex-wrap: wrap` with `justify-content: center`, so any number of creators (1, 6, 12+) composes acceptably without horizontal scroll.
- Hero padding-top scales from 48px (mobile) to 80px (desktop); the headline must sit clearly above the avatars, never pinned to the top edge.
- Generous outer margins keep the gradient and blobs visible at all viewports, reinforcing that the canvas is part of the content, not chrome.

Asymmetry is welcome: the rainbow rotations on headline words and the random angles of blob morphing both intentionally break orthogonal rhythm. The geometric discipline lives in the avatar grid, which stays strictly horizontal and circular.

## Elevation & Depth

Depth is communicated through *blur differential* and *outline weight*, not box-shadows on rectangles.

- **Layer 0 (Canvas):** the body gradient — fixed, opaque, unblurred.
- **Layer 1 (Atmosphere):** five organic blobs — high opacity (65%), high blur (32px), no border. Reads as depth-of-field bokeh.
- **Layer 2 (Sticker stack):** all foreground elements (header, headline, avatars, labels). White outlines visually separate them from the gradient. Drop-shadows are subtle and tinted toward indigo (`rgba(60,25,100,0.18)`) rather than neutral black, so shadows feel native to the violet canvas.
- **Layer 3 (Hover):** an avatar ring on hover gains a colored halo (`box-shadow` tinted by its own gradient stops), scales by 1.12, and starts a 2-second shimmer that animates the gradient's `background-position`.

There are **no glassmorphic surfaces** and **no `backdrop-filter: blur()`** on this screen. Translucency is reserved for the footer divider line and the dark-mode blob opacity reduction.

## Motion

Movement is the single most important non-visual aspect of this design. The screen has *four* concurrent ambient animations, each on a different period, so the page never repeats a frame:

| Layer | Animation | Period |
|---|---|---|
| Blobs (×5) | Organic morph + slow drift, each with offset `animation-delay` and slightly different durations | 22–30s |
| Headline | Per-word vertical bob, 6px amplitude, staggered `-0.4s` between words | 4s |
| Avatar rings | Idle "breathe" — alternating between odd/even children, scale 1.0 → 1.03 | 4s (offset 2s) |
| Avatar rings (hover) | Background-position shimmer overrides idle breathe | 2s |

All ambient animation respects `prefers-reduced-motion: reduce` and is suppressed entirely in that mode — the design must read as crisp and intentional even when frozen.

The bounce timing curve `cubic-bezier(0.34, 1.56, 0.64, 1)` is used for all scale-up transitions (avatar hover) to give a slight overshoot. Linear easing is used only for the shimmer (a position-loop animation, not a state transition).

Motion is never decorative-only: every ambient animation either communicates aliveness (blobs, breathing) or signals interactivity affordance (hover shimmer).

## Shapes

The system uses a small, expressive shape vocabulary:

- **Circles** for creator avatars (`50%`) — non-negotiable, reinforces the "characters" metaphor.
- **Pills and rounded squares** for buttons and chips (`xl`–`2xl` radii).
- **Organic blobs** with irregular per-corner radii (`58% 42% 56% 44% / 52% 60% 40% 48%`) for the background atmosphere — these are not pure ovals. The four pairs of corner percentages create asymmetric, lobed shapes that morph through the animation cycle into the alternate `42% 58% 38% 62% / 60% 38% 62% 40%` form.
- **No sharp 90° corners anywhere on this screen.** Cards inherit `2xl` radii. The transparent header has no border-radius but is also borderless on this screen.

Iconography (when present) is line-based with rounded caps, 2–2.5px stroke, and fills only for solid brand marks (e.g. a play-cutout logomark).

## Components

### Gradient Canvas

The full-bleed background. Applied to the document body (so it spans header → main → footer continuously) using `background-attachment: fixed`. Five gradient stops at `0% / 22% / 50% / 78% / 100%` along a 140° axis. Required behind every element on this screen — never use a solid surface.

### Organic Blob

A `<div>` with an irregular border-radius, a single radial-gradient fill, 32px blur, and 65% opacity. Five instances per screen, sized 320–540px, positioned with negative `top`/`bottom`/`left`/`right` so they bleed past the viewport. Animation: 22–30s morph cycle with staggered delays.

### Balloon Word

The atomic unit of the headline. An inline `<span>` with:

- `display: inline-block` (so transform applies)
- A solid color from the rainbow palette
- `-webkit-text-stroke: 3–7px #FFFFFF` with `paint-order: stroke fill`
- A static rotation (-2.5° to +2°) and a continuous 4s bob animation (using the standalone `translate` property so it composes with the static rotate)

Words are not tied to specific colors; the canonical order maps coral → peach → sunflower → mint → sky → lavender for a natural rainbow read, but any word longer than 8 characters should drop a slot in the rainbow to preserve balance.

### Balloon Heading

The wrapper for one or more Balloon Words. Provides:

- `font-family: Fredoka` at `clamp(2.75rem, 9vw, 6rem)`
- A two-stop drop-shadow filter (flat lift + soft cushion), tinted indigo
- Center text alignment
- No background, no padding

Use only for the primary screen-defining headline. Do not nest, and do not reuse for body copy.

### Avatar Ring

A circular gradient-bordered container for a creator portrait. Two layers:

1. **Outer ring** — a 4px-padded circle whose `background` is a 3-stop linear-gradient using two custom-property colors. Each instance receives a different rainbow pair from a rotating set of seven combinations.
2. **Inner clip** — a circle that masks the portrait image to the ring shape.

Idle behavior: alternating breathe animation (odd/even children offset by 2s). Hover: 1.12 scale + colored halo (`box-shadow` tinted by the ring's own stops) + gradient shimmer. `:focus-visible` mirrors hover for keyboard parity.

### Creator Label

The text under each avatar. Uses Fredoka 700, deep-ink purple-black fill, 2px white outline, `paint-order: stroke fill`, plus a single soft white text-shadow for extra cushion. Width is fixed (110px / 140px responsive) with `line-clamp: 2` to handle long names without breaking the grid rhythm.

### Header (Transparent Variant)

On gradient-canvas screens, the standard app header collapses to:

- Transparent background (no `backdrop-filter`)
- Transparent border-bottom
- Logo, primary action, and account, all rendered in white or near-white

The header is sticky but invisible until interacted with — the gradient canvas reads through it.

### Footer (On-Gradient Variant)

A single line of small Nunito text, white at 78% opacity, with a soft 1px-4px blue-violet text-shadow for legibility against varying gradient stops. Border-top divider at `rgba(255,255,255,0.18)`.

### Grain Overlay

A fixed, full-viewport SVG fractal-noise overlay at 1.8% opacity sits at `z-index: 1` (above gradient, below content). Adds analog texture and breaks up the smoothness of the gradient at large viewports. Optional but recommended.

### Pill Button (Primary / Ghost)

Pill-shaped action elements. **Primary** uses solid mint green `#58CC02` with white text; **Ghost** is transparent with white text and inherits hover-tint from the surrounding gradient. Both use Fredoka 700 for the label and a resting card shadow only on the primary variant.

## Imagery & Iconography

- **Creator portraits** are square-cropped photographs or character illustrations, color-corrected toward warm saturation. They are masked into a circle by the avatar inner-clip and never displayed unmasked.
- **Logomark** is a stylized play-button cutout — the only sharp shape allowed in the system. It must be rendered in a single brand color or pure white over the gradient.
- **Decorative iconography** (when added) follows a rounded-line style at 2–2.5px stroke, never filled. Functional UI icons (play, pause, search) follow the same rule.
- **No emoji** in primary UI surfaces — the rainbow palette and motion already carry the playful tone, and emoji adds visual noise.

## Accessibility

- All foreground text targets WCAG AA at minimum, achieved via the white-stroke technique that boosts contrast against the unpredictable gradient stops.
- All decorative animation respects `prefers-reduced-motion: reduce` and is **removed entirely**, not slowed, in that mode.
- Focus-visible states are visually identical to hover states for the avatar ring (scale + halo) and use a 2px primary-mint outline for any pill button or text input that lives on the gradient.
- Hover-only interactions are forbidden: every hover affordance has a tap and keyboard equivalent.
- Tap targets on the avatar grid are minimum 100×100px (mobile) and grow to 140×140px at desktop.

## What This System Is Not

To keep the aesthetic from drifting toward generic, the system explicitly rejects:

- Pastel-on-white layouts and timid evenly-distributed palettes
- Glassmorphism / `backdrop-filter` blurs on cards
- Drop-shadows on rectangles to imply elevation
- Inter, Roboto, or system fonts as display type
- Purple-gradient-on-white CTAs
- Symmetrical, perfectly-aligned hero compositions
- Emoji as decoration in primary UI
- Solid-color fills in the absence of the gradient canvas

If a future surface needs to depart from this system, it should depart deliberately and in full — not by mixing balloon type with neutral surfaces or vice-versa.
