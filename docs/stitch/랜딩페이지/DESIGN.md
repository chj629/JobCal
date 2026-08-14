---
name: Blueprint Narrative
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d5e3fd'
  on-surface: '#0d1c2f'
  on-surface-variant: '#444651'
  inverse-surface: '#233144'
  inverse-on-surface: '#ebf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#0060ac'
  on-secondary: '#ffffff'
  secondary-container: '#64a8fe'
  on-secondary-container: '#003c70'
  tertiary: '#262b2e'
  on-tertiary: '#ffffff'
  tertiary-container: '#3c4144'
  on-tertiary-container: '#a8adb1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#dfe3e7'
  tertiary-fixed-dim: '#c3c7cb'
  on-tertiary-fixed: '#171c1f'
  on-tertiary-fixed-variant: '#43474b'
  background: '#f8f9ff'
  on-background: '#0d1c2f'
  surface-variant: '#d5e3fd'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '350'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '350'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '350'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '350'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 32px
  gutter: 24px
  section-gap: 64px
  pill-padding-x: 24px
  pill-padding-y: 12px
---

## Brand & Style

The design system moves away from whimsical aesthetics toward a **Modern Professional Productivity** studio environment. It is engineered for job seekers who require a sense of order, reliability, and calm during high-stakes career transitions. 

The style utilizes **Hyper-Modern Minimalism** mixed with **Tactile Precision**. It retains the distinct, oversized pill geometry for structural grounding but strips away decorative gradients in favor of clean, architectural surfaces. The interface should feel like a premium physical workspace: organized, expansive, and high-fidelity.

**Key Visual Pillars:**
- **Pill Architecture:** Dramatic 100px corner radii for containers and major UI components.
- **Light Airiness:** Significant white space paired with subtle blue-tinted neutrals to prevent visual fatigue.
- **Technical Typography:** Light font weights (350) provide a sophisticated, editorial feel that balances the heavy geometry.

## Colors

The palette is anchored in trust and clarity. It replaces all lavender tones with a tiered blue system designed to guide the eye through complex workflows.

- **Primary (Navy - #1E3A8A):** Used for structural navigation, headers, and core brand elements. It provides the "anchor" for the page.
- **Action (Sky - #60A5FA):** Reserved for high-priority interactive elements (CTAs, active toggles, focus states). It is vibrant but maintains a calm, professional frequency.
- **Surface (Ghost Blue - #F1F5F9):** The primary background color for containers, creating a soft distinction from the pure white base.
- **Text (Slate - #334155):** A deep, de-saturated grey used to ensure high legibility without the harshness of pure black.

## Typography

This design system utilizes **Hanken Grotesk** as its primary typeface to achieve a clean, sharp, and contemporary look. The signature weight is **350 (Light/Book)**, which creates an elegant, airy texture across the interface.

**Usage Guidelines:**
- **Large Displays:** Use the 350 weight for all display titles to emphasize the professional "studio" aesthetic.
- **Technical Metadata:** Use **JetBrains Mono** for status labels, dates, and category tags to lean into the productivity tool persona.
- **Contrast:** Increase font-weight to 500 only for functional labels or subheaders that require immediate scannability against high-density data.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Content resides within a maximum width of 1280px, centered on the screen, but background surfaces bleed to the edges to maintain the expansive studio feel.

- **Rhythm:** An 8px base grid governs all padding and margins.
- **Vertical Air:** Use generous `section-gap` (64px) between major functional blocks to prevent the UI from feeling cluttered during the job search process.
- **Mobile Reflow:** On mobile, margins reduce to 16px, and pill-shaped elements maintain their 100px radius but shrink in height to prioritize vertical screen real estate.

## Elevation & Depth

Elevation is achieved through **Tonal Layering** and **Soft Ambient Occlusion** rather than heavy shadows.

- **Level 0 (Base):** White (#FFFFFF).
- **Level 1 (Surface):** Ghost Blue (#F1F5F9) containers with 100px roundedness.
- **Level 2 (Active/Floating):** Use a very soft, diffused shadow (0px 4px 20px rgba(30, 58, 138, 0.05)) to lift active cards or dropdowns.
- **Stroke-over-Shadow:** Prefer a 1px solid border in a slightly darker tint of the background (#E2E8F0) over shadows for a cleaner, more technical finish.

## Shapes

The design system is defined by its **Hyper-Pill** geometry. Every container, button, and input field should strive for the maximum possible corner radius, creating a friendly yet structured environment.

- **Standard Pill:** 100px (applied to all buttons, input fields, and tags).
- **Section Containers:** 48px radius for large content blocks (cards, dashboard panels).
- **Small Elements:** 12px for micro-interactions like checkboxes or mini-indicators where a full pill is not feasible.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Sky Blue (#60A5FA) with white text. 100px pill shape. 350 font weight.
- **Ghost Input:** Transparent background with 1px Navy (#1E3A8A) border at 20% opacity. Transitions to 100% Action color on focus.

### Cards & Surfaces
- **Job Cards:** Pure white background with a 48px corner radius. A 1px Ghost Blue border provides definition. On hover, the border shifts to the Action Sky Blue.

### Navigation
- **Top Bar:** 100px height. Fixed to top. Uses a slight backdrop blur (12px) with a semi-transparent White (90% opacity) finish.

### Status Indicators (Chips)
- **Application Status:** Use JetBrains Mono for the text. Pill shape. Background is a 10% opacity tint of the status color (e.g., Success = Green, Pending = Navy).

### Specialized Components
- **Progress Stepper:** A horizontal track of connected pills. Completed steps are filled with the Action color; current steps have a 2px Action border.