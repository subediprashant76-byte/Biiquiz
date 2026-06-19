---
name: Academic Precision
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#5b598c'
  on-secondary: '#ffffff'
  secondary-container: '#c7c3fe'
  on-secondary-container: '#514f81'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e3dfff'
  secondary-fixed-dim: '#c4c1fb'
  on-secondary-fixed: '#181445'
  on-secondary-fixed-variant: '#444173'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono-label:
    fontFamily: Courier Prime
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding-mobile: 16px
  container-padding-desktop: 32px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for high-stakes academic administration. It prioritizes clarity, efficiency, and authoritative oversight. The brand personality is professional and unbiased, acting as a transparent medium for complex data management. 

The design style is **Corporate Modern** with a focus on high information density. It utilizes a refined, systematic approach to white space and alignment to ensure that even data-heavy screens remain legible and navigable. The aesthetic response should be one of "controlled power"—giving administrators the tools to manage large-scale quiz infrastructure without cognitive overload.

## Colors
The palette is rooted in an Indigo primary to signify trust and intelligence. Surfaces are predominantly white to ensure maximum contrast for text, while the light gray background (#F9FAFB) provides a subtle anchor for card-based layouts. 

Functional colors are critical for this design system:
- **Primary (#4F46E5):** Used for primary actions, active states, and progress indicators.
- **Surface:** Pure white (#FFFFFF) for cards and containers to pop against the subtle gray background.
- **Borders (#E5E7EB):** Used for structural definition without adding visual noise.
- **Semantic Palette:** High-saturation status colors are used sparingly for badges and alerts to immediately signal system health or student performance outcomes.

## Typography
The system uses **Inter** exclusively to leverage its exceptional legibility in UI contexts. Typography is scaled for density; body-md (14px) is the standard for most data entries. 

- **Weight Strategy:** Use Semi-Bold (600) for headers to create clear visual hierarchy. Regular (400) is used for all data input and reading text.
- **Micro-copy:** label-md is reserved for table headers and section categorizations, utilizing a slight tracking increase and uppercase transform for distinct separation from data.
- **Numbers:** Tabular lining should be enabled for all numerical data in tables to ensure columns of figures align perfectly.

## Layout & Spacing
The layout employs a **12-column fluid grid** for the main content area, anchored by a fixed-width left navigation sidebar (240px). 

- **Density:** We utilize a 4px baseline grid. Internal component padding is tight (8px to 12px) to maximize the amount of visible data on-screen without requiring excessive scrolling.
- **Breakpoints:** 
    - Desktop: 1280px+ (Full sidebar + 12 columns)
    - Tablet: 768px - 1279px (Collapsed sidebar + 8 columns)
    - Mobile: Below 768px (Hidden sidebar with hamburger + 4 columns, margins reduced to 16px)
- **Grouping:** Use the `stack-lg` (24px) to separate logical sections of a page (e.g., Stats overview vs. Main Data Table).

## Elevation & Depth
Depth is achieved through **Tonal Layering** and ultra-soft shadows. We avoid heavy dropshadows to maintain a professional, flat-ish "SaaS" aesthetic.

- **Level 0 (Background):** #F9FAFB. The canvas.
- **Level 1 (Cards/Sidebar):** White (#FFFFFF) with a 1px border (#E5E7EB). No shadow.
- **Level 2 (Dropdowns/Modals):** White with a soft, diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`.
- **Interactive States:** Hovering over a list item or table row should apply a subtle tint (#F3F4F6) rather than an elevation change.

## Shapes
The design system uses a "Soft" shape language (4px radius). This provides a professional appearance that is modern but stays clear of the overly "bubbly" consumer-app aesthetic.

- **Components:** Buttons, Input fields, and Cards all share the 0.25rem (4px) base radius.
- **Inner elements:** Progress bar containers and status badges follow the same rounding for consistency.
- **Exceptions:** Checkboxes use a 2px radius to maintain their sharp, functional identity.

## Components
Consistent implementation of these components ensures the system remains enterprise-ready.

- **Data Tables:** The core of the system. Use a 1px horizontal-only border style. Rows should be 48px high for standard density. Header cells are #F9FAFB with label-md typography. Multi-select checkboxes appear in the first column.
- **Status Badges:** Small, subtle backgrounds (10% opacity of the semantic color) with high-contrast text (100% opacity). Example: Success badge is #D1FAE5 background with #065F46 text.
- **Progress Bars:** Use a 8px height for usage limits. The track is #E5E7EB, and the fill is the Primary Indigo. For "critical" limits (e.g., 90%+), the fill should swap to the Error red.
- **Buttons:** 
    - *Primary:* Indigo background, white text.
    - *Secondary:* White background, gray-300 border, gray-700 text.
    - *Ghost:* No background or border, Indigo text.
- **Input Fields:** 1px #E5E7EB border. On focus, use a 1px Primary Indigo border with a 3px soft Indigo outer glow (20% opacity).
- **Tabbed Views:** Horizontal underlines for active tabs. Active tab text is Primary Indigo; inactive is Gray-500.