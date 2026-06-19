---
name: Academic Vitality
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e5'
  on-secondary-container: '#626567'
  tertiary: '#2c2abc'
  on-tertiary: '#ffffff'
  tertiary-container: '#4648d4'
  on-tertiary-container: '#d1d1ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#e0e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max-width: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system bridges the gap between rigorous academic assessment and engaging, gamified learning. It targets students and corporate trainees who require a professional environment that doesn't feel stagnant or intimidating. 

The aesthetic is **Corporate Modern** with a **Vibrant** twist. It utilizes high-clarity layouts and systematic spacing to maintain authority, while introducing energetic color accents and subtle depth to encourage interaction. The goal is to evoke a sense of "active intelligence"—a state where the user feels focused, capable, and motivated to progress through challenges.

## Colors
The palette is anchored by a dynamic **Primary Blue (#1d4ed8)**, which provides a high-contrast, professional signal for primary actions. 

- **Primary:** Used for main buttons, active states, and progress indicators.
- **Semantic Palette:** These colors use high-saturation values to ensure instant feedback during quizzes. Success green (#10b981) and Error red (#ef4444) are the primary drivers of the user's emotional "win/loss" loop.
- **Backgrounds:** Use a clean, slate-tinted white for the main surface to reduce eye strain, paired with a very light cool-grey (#f1f5f9) for secondary containers.
- **Gradients:** Subtle linear gradients (Primary to Tertiary) may be used sparingly on large hero cards or progress tracking dashboards to signify "Knowledge Mastery."

## Typography
This design system utilizes **Inter** across all levels to ensure maximum legibility and a systematic, technical feel suitable for both individual learning and enterprise reporting.

- **Scale:** High contrast between headlines and body text helps users scan complex quiz questions quickly.
- **Weights:** Bold (700) and Extra Bold (800) are reserved for key milestones and section headers. Medium (500) is the standard for functional labels.
- **Readability:** Line heights are slightly generous (1.5x for body text) to accommodate dense academic content without causing fatigue.

## Layout & Spacing
The layout follows a strict **8px grid system** to maintain "Academic Precision." 

- **Grid:** A 12-column fluid grid is used for dashboards, while a centered 8-column "Focus" grid is used for the actual quiz interface to minimize lateral eye movement.
- **Breakpoints:**
  - **Mobile (<640px):** Single column, 16px side margins.
  - **Tablet (640px - 1024px):** 8 columns, 24px margins.
  - **Desktop (>1024px):** 12 columns, 40px margins, capped at 1280px.
- **Density:** Use "Comfortable" spacing for learning content (e.g., 32px between question sections) and "Compact" spacing for data-heavy enterprise tables.

## Elevation & Depth
The system uses **Tonal Layers** combined with **Ambient Shadows** to create a structured hierarchy.

- **Level 0 (Background):** Solid white or very light cool-grey.
- **Level 1 (Cards/Containers):** White surface with a 1px border (#e2e8f0) and a subtle 4px blur shadow with 5% opacity.
- **Level 2 (Interactive/Hover):** Lifted state with an 8px blur shadow and 10% opacity. 
- **Quiz Elements:** Use a subtle "inset" shadow for unselected answer options to provide a tactile, pressable feel, switching to a solid Primary Blue border when selected.

## Shapes
Following the **ROUND_EIGHT** principle, the standard corner radius is **8px (0.5rem)**. 

- **Base (8px):** Buttons, Input fields, and standard Cards.
- **Large (16px):** Modal containers and main dashboard feature blocks.
- **Full (Pill):** Used exclusively for status chips (e.g., "In Progress," "Completed") and progress bar caps to provide a friendly, organic contrast to the structured grid.

## Components
- **Buttons:** Primary buttons use a solid Primary Blue fill with white text. "Quiz Next" buttons may feature a subtle right-pointing chevron.
- **Quiz Cards:** Large containers with an 8px radius. Active questions are highlighted with a 2px Primary Blue left-border.
- **Input Fields:** 8px rounded corners with a 1px slate border. On focus, the border thickens to 2px Primary Blue with a soft blue outer glow.
- **Status Chips:** Small, pill-shaped indicators using the semantic color palette at 10% opacity for the background and 100% opacity for the text.
- **Progress Bars:** Thick (8px or 12px) tracks with a Primary Blue or Success Green fill. The track background should be a light #f1f5f9.
- **Feedback Toasts:** Use high-saturation semantic colors for the left-edge accent to ensure users notice success/error messages immediately.