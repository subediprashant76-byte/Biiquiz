---
name: Academic Precision
colors:
  surface: '#FFFFFF'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#434655'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#EF4444'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#F9FAFB'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
  warning: '#F59E0B'
  border: '#E5E7EB'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
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
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
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
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The brand personality is rooted in the "SaaS for Education" philosophy—moving away from gamified, high-energy aesthetics toward a calm, focused, and reliable environment. It targets educators and corporate trainers who require a tool that feels like a professional utility rather than a toy.

The design style is **Corporate / Modern** with a focus on **Minimalism**. It utilizes generous white space, a disciplined color application, and high-quality typography to ensure that the quiz content remains the hero. The interface should feel fast and frictionless, evoking a sense of competence and clarity.

## Colors
The palette is dominated by "Trustworthy Blue" to establish authority. Functional colors (Success, Warning, Error) are used sparingly to provide clear feedback without overwhelming the user. 

- **Primary:** Used for main actions, active states, and branding elements.
- **Surface & Background:** A subtle distinction between `#FFFFFF` (cards and inputs) and `#F9FAFB` (page background) creates soft depth.
- **Neutral:** A deep gray-blue used for text to ensure high legibility while appearing softer than pure black.

## Typography
The system uses **Inter** exclusively to maintain a clean, systematic, and utilitarian feel. The hierarchy is strictly defined to help teachers quickly scan quiz data and students focus on questions.

- **Headlines:** Use tighter letter spacing and heavier weights to create a sense of structure.
- **Body:** Sized slightly larger than standard (16px and 18px) to accommodate the educational context where readability is paramount.
- **Labels:** Used for metadata, badges, and small UI details, often employing a medium weight for clarity at small sizes.

## Layout & Spacing
The system employs a **Fluid Grid** model with a strong emphasis on vertical rhythm based on an 8px square grid. 

- **Desktop:** A 12-column grid with 24px gutters. Content is typically contained within a 1280px max-width to prevent line lengths from becoming unreadable.
- **Mobile:** A 4-column grid with 16px margins. Components like quiz options should span the full width of the grid to provide "large tap targets" for participants.
- **Spacing Rhythm:** Use 8px increments for internal component padding and 16px/24px/32px for layout sections to maintain a clean, airy feel.

## Elevation & Depth
To achieve a "professional SaaS" look, this system rejects heavy shadows in favor of **Tonal Layers** and **Ambient Shadows**.

- **Level 0 (Background):** `#F9FAFB` – The lowest layer.
- **Level 1 (Surface):** `#FFFFFF` with a 1px border (`#E5E7EB`). Used for standard cards.
- **Level 2 (Elevated):** `#FFFFFF` with a soft, diffused shadow (0px 4px 12px rgba(0, 0, 0, 0.05)). Used for active elements, hover states, or modals.
- **Interactions:** Subtle scale-downs (98%) on press provide tactile feedback without the need for aggressive "squishy" animations.

## Shapes
The shape language is "Rounded" but disciplined. 

- **Cards & Containers:** Use a 12px (`rounded-lg`) radius as the standard. This strikes a balance between friendly (rounded) and professional (structured).
- **Buttons & Inputs:** Use a 8px (`rounded-md`) radius to maintain a slightly sharper, more precise appearance than the containers they sit within.
- **Badges:** Use a pill-shaped radius for distinct visual separation from other square-ish UI elements.

## Components

- **Buttons:** Primary buttons use solid `#2563EB` with white text. Secondary buttons use a subtle gray stroke. For participant screens, buttons should be "jumbo" (minimum height 56px) to ensure ease of use on mobile devices.
- **Cards:** White surfaces with 12px rounded corners and a 1px `#E5E7EB` border. In the host dashboard, cards should feature a subtle hover state that increases the shadow depth.
- **Input Fields:** Clean, white backgrounds with 1px borders. Focus states use a 2px Primary Blue ring with high offset to ensure accessibility.
- **Badges/Chips:** Used for "Live," "Draft," or "Subject Tags." These should have a light tinted background (e.g., 10% opacity of the status color) with high-contrast text.
- **List Items:** Use for quiz question banks. High density with clear dividers and trailing icons for "Edit" or "Drag" actions.
- **Progress Bars:** Thin, 4px height bars using the Primary Blue, located at the very top of the participant's viewport to indicate quiz progress without distraction.