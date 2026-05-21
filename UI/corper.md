---
name: Institutional Verification Framework
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3e4a41'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6e7a70'
  outline-variant: '#bdcabe'
  surface-tint: '#006d40'
  primary: '#006b3f'
  on-primary: '#ffffff'
  primary-container: '#008751'
  on-primary-container: '#fdfff9'
  inverse-primary: '#70db9d'
  secondary: '#465f88'
  on-secondary: '#ffffff'
  secondary-container: '#b6d0ff'
  on-secondary-container: '#3f5881'
  tertiary: '#4e5e74'
  on-tertiary: '#ffffff'
  tertiary-container: '#67778e'
  on-tertiary-container: '#fffeff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#8df8b7'
  primary-fixed-dim: '#70db9d'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#00522f'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#aec7f6'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#2d476f'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for a high-stakes government environment where trust, security, and procedural integrity are paramount. The visual language avoids "startup" trends in favor of a **Corporate/Modern** aesthetic that emphasizes stability and authority. 

The design evokes a sense of duty and reliability, utilizing structured layouts and a restrained aesthetic to facilitate efficient data processing. It is designed for civil servants and medical professionals who require high-density information display without cognitive overload. The interface should feel like a digital extension of an official document: clear, permanent, and beyond reproach.

## Colors
This palette is grounded in the National Identity of Nigeria, led by **Deep Nigerian Green** to establish immediate institutional recognition. **Professional Navy** is used for navigation and high-level headers to provide a serious, grounding contrast.

- **Backgrounds:** Use `#F8FAFC` for the primary canvas and `#F1F5F9` for secondary containers to create subtle depth without relying on shadows.
- **Accents:** Slate Gray is reserved for utility icons, borders, and de-emphasized text.
- **Status Colors:** These follow universal conventions but are slightly muted to remain professional within the interface, ensuring critical medical status flags are legible but not "alarming" in a way that disrupts the workflow.

## Typography
**Inter** is the sole typeface for the design system to ensure maximum legibility and a systematic, utilitarian feel. 

- **Headlines:** Use Bold weights for page titles and semi-bold for section headers to establish a clear hierarchy in data-heavy views.
- **Body:** The base size is 16px to ensure accessibility for all users. The 14px variant is reserved for supplementary data within tables or sidebars.
- **Labels:** Small, uppercase labels with increased letter spacing are used for metadata and table headers to distinguish them from actionable content.
- **Mobile Adjustments:** `headline-xl` should scale down to 24px on mobile devices to prevent excessive text wrapping in form-heavy screens.

## Layout & Spacing
The layout follows a **Fixed Grid** model on desktop to maintain a structured, document-like feel, centered within a 1280px container. 

- **Grid:** Use a 12-column system for dashboard layouts.
- **Density:** The system utilizes a compact 8px spacing scale. However, white space should be used strategically between logical "blocks" of data to prevent visual fatigue.
- **Responsive Behavior:** On tablet and mobile, the 12-column grid collapses to 4 columns. Margins shrink from 40px to 16px to maximize the narrow real estate for complex forms.

## Elevation & Depth
To maintain an authoritative and grounded feel, the design system avoids heavy shadows and floating elements. Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Levels:** The primary background is the lowest level. White cards (#FFFFFF) sit on top of the light gray background.
- **Borders:** Use 1px solid borders in `#E2E8F0` to define card boundaries and input fields.
- **Interaction Elevation:** Only use a very subtle, tight shadow (0px 2px 4px rgba(0,0,0,0.05)) on primary buttons or active modal windows to indicate they are interactive or temporarily on top of the stack.

## Shapes
The shape language is conservative and "Soft" (4px/0.25rem radius). 

- **Buttons & Inputs:** Use the standard 4px radius. 
- **Large Containers:** Cards and modals may use up to 8px (0.5rem) to slightly soften the enterprise look, but sharp corners are preferred over excessively rounded ones to maintain a sense of formal structure.
- **Badges:** Use a slightly higher radius (12px) to distinguish them from interactive buttons, but avoid full pill shapes which can appear too casual.

## Components
- **Data Tables:** These are the core of the system. Use a strict horizontal rule style with `#F1F5F9` zebra-striping. Headers must be `label-bold` with a Slate Gray background.
- **Status Badges:** Use a "Light Fill" style—soft background tint with high-contrast text (e.g., Light Red background with Deep Red text for "Rejected").
- **Buttons:** 
  - *Primary:* Deep Nigerian Green with white text.
  - *Secondary:* Professional Navy outline with navy text.
  - *Tertiary:* Ghost style (no border/fill) for less important actions.
- **Input Fields:** Use "Stacked" labels (label above the input). Borders should turn Professional Navy when focused. 
- **Step-by-Step Indicators:** Use a linear horizontal stepper for desktop and a vertical "progress list" for mobile. Completed steps should use the Success Green checkmark.
- **High-Density Cards:** Use for corps member profiles. Information should be grouped into logical clusters (e.g., Personal Info, Medical Data, Relocation Status) separated by subtle dividers.