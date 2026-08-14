---
name: Phantom
colors:
  surface: '#fdf8fc'
  surface-dim: '#ddd9dd'
  surface-bright: '#fdf8fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f2f6'
  surface-container: '#f1ecf1'
  surface-container-high: '#ece7eb'
  surface-container-highest: '#e6e1e5'
  on-surface: '#1c1b1e'
  on-surface-variant: '#49454e'
  inverse-surface: '#313033'
  inverse-on-surface: '#f4eff4'
  outline: '#7a757f'
  outline-variant: '#cac4cf'
  surface-tint: '#635884'
  primary: '#261b44'
  on-primary: '#ffffff'
  primary-container: '#3c315b'
  on-primary-container: '#a79acb'
  inverse-primary: '#cdbff2'
  secondary: '#5d5c76'
  on-secondary: '#ffffff'
  secondary-container: '#e2dffe'
  on-secondary-container: '#63627c'
  tertiary: '#221260'
  on-tertiary: '#ffffff'
  tertiary-container: '#372b77'
  on-tertiary-container: '#a297e9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e8ddff'
  primary-fixed-dim: '#cdbff2'
  on-primary-fixed: '#1f143d'
  on-primary-fixed-variant: '#4b406b'
  secondary-fixed: '#e2dffe'
  secondary-fixed-dim: '#c6c3e1'
  on-secondary-fixed: '#1a192f'
  on-secondary-fixed-variant: '#45445d'
  tertiary-fixed: '#e5deff'
  tertiary-fixed-dim: '#c9bfff'
  on-tertiary-fixed: '#1a075a'
  on-tertiary-fixed-variant: '#473b87'
  background: '#fdf8fc'
  on-background: '#1c1b1e'
  surface-variant: '#e6e1e5'
  aubergine: '#3c315b'
  ghost-lavender: '#e2dffe'
  periwinkle: '#ab9ff2'
  cornflower-pop: '#4a87f2'
  buttercream: '#ffffc4'
  blush-mist: '#ffdadc'
  mint-signal: '#2ec08b'
  paper-white: '#fdfcfe'
  obsidian: '#1c1c1c'
  fog: '#86848d'
  ash: '#e9e8ea'
  bone: '#f4f2f4'
typography:
  display-hero:
    fontFamily: DM Sans
    fontSize: 96px
    fontWeight: '300'
    lineHeight: '1.0'
    letterSpacing: -0.025em
  display-lg:
    fontFamily: DM Sans
    fontSize: 80px
    fontWeight: '300'
    lineHeight: '1.1'
    letterSpacing: -0.025em
  display-md:
    fontFamily: DM Sans
    fontSize: 64px
    fontWeight: '300'
    lineHeight: '1.1'
    letterSpacing: -0.025em
  headline-sm:
    fontFamily: DM Sans
    fontSize: 30px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.025em
  title-lg:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.25'
    letterSpacing: -0.025em
  title-md:
    fontFamily: DM Sans
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.35'
    letterSpacing: -0.025em
  body-lg:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: -0.025em
  body-md:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: -0.025em
  label-sm:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.21'
    letterSpacing: -0.025em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  gap-element: 12px
  gap-section: 64px
  padding-card: 48px
  max-width: 1200px
---

# Phantom — Style Reference
> lavender candy shop at dusk. A monochromatic violet world where everything is a soft pill on a near-white plane, interrupted by a mischievous ghost and pastel highlights.

**Theme:** mixed

Phantom is a soft, monochromatic crypto-wallet world bathed in aubergine and lavender. The interface lives in a near-white canvas but bleeds into deep violet sections, creating a mood that oscillates between airy and intimate. Typography is whisper-weight (350) with aggressive negative tracking, letting massive 80-96px hero lines float with grace. The defining signature is generous pill-shaped geometry — navigation, buttons, and cards all dissolve into capsule forms with 24-100px radii. A single ghost mascot replaces vowels in headlines, breaking the grid with playful subversion. The palette is deliberately narrow: one primary violet does all the structural work, while pastel button tints (lavender, butter, blush) create a candy-store rhythm against the restrained backdrop.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Aubergine | `#3c315b` | `--color-aubergine` | Primary brand — navigation borders, nav text, heading text, card surfaces in dark sections, icon strokes. The structural spine of the entire system |
| Ghost Lavender | `#e2dffe` | `--color-ghost-lavender` | Primary action — filled CTA button background, violet glow shadow on buttons. The light-on-light button that only reveals its presence through a soft 4px halo |
| Periwinkle | `#ab9ff2` | `--color-periwinkle` | Secondary action — brighter lavender for secondary CTAs, decorative fills, icon accents. Adds saturation to the pale-violet world |
| Cornflower Pop | `#4a87f2` | `--color-cornflower-pop` | Accent button — occasional vivid blue button for emphasis or differentiation. Use sparingly as a high-energy interruption |
| Buttercream | `#ffffc4` | `--color-buttercream` | Accent button — pale yellow button fill for variety in multi-action contexts. Pastel punctuation in the candy palette |
| Blush Mist | `#ffdadc` | `--color-blush-mist` | Accent button — near-gray pink button for warmth and tonal range. The softest of the pastel set |
| Mint Signal | `#2ec08b` | `--color-mint-signal` | Success badge — vivid green for status indicators, positive confirmations, live signals |
| Paper White | `#fdfcfe` | `--color-paper-white` | Canvas — page background, card surfaces, button borders, text on dark backgrounds. Near-white with the faintest cool tint |
| Obsidian | `#1c1c1c` | `--color-obsidian` | Body text, heading text on light backgrounds, button borders, card borders. The near-black ink for all foreground content |
| Fog | `#86848d` | `--color-fog` | Muted text, icon strokes, secondary nav borders. The quiet gray for non-emphasized elements |
| Ash | `#e9e8ea` | `--color-ash` | Button background, subtle surface fill. The neutral pale surface beneath lavender hero panels |
| Bone | `#f4f2f4` | `--color-bone` | Surface background — light section panels, button fills. The warmest of the near-white neutrals |

## Tokens — Typography

### Phantom — Custom typeface used for everything. Weight 350 is the default body and display weight.
- **Substitute:** Inter, Söhne, or DM Sans at matching weight 300/400 with -0.025em tracking
- **Weights:** 350, 400
- **Sizes:** 13, 15, 16, 20, 24, 30, 64, 80, 96
- **Line height:** 1.00, 1.10, 1.20, 1.21, 1.25, 1.35, 1.40
- **Letter spacing:** -0.025em at all sizes

## Tokens — Spacing & Shapes

**Base unit:** 4px
**Density:** comfortable

### Border Radius
| Element | Value |
|---------|-------|
| nav | 100px |
| tags | 100px |
| cards | 24px |
| links | 32px |
| buttons | 100px |

### Shadows
| Name | Value | Token |
|------|-------|-------|
| sm | `rgb(226, 223, 254) 0px 0px 4px 0px` | `--shadow-sm` |

### Layout
- **Page max-width:** 1200px
- **Section gap:** 64px
- **Card padding:** 48px
- **Element gap:** 8-16px
