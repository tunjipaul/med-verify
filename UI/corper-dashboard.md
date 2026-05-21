---
name: NYSC Medical Relocation Verification System
colors:
  surface: '#f7fbf3'
  surface-dim: '#d7dbd4'
  surface-bright: '#f7fbf3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f5ee'
  surface-container: '#ebefe8'
  surface-container-high: '#e5e9e2'
  surface-container-highest: '#dfe4dd'
  on-surface: '#181d19'
  on-surface-variant: '#3f4940'
  inverse-surface: '#2d322d'
  inverse-on-surface: '#eef2eb'
  outline: '#6f7a70'
  outline-variant: '#bfc9be'
  surface-tint: '#0e6d3b'
  primary: '#005129'
  on-primary: '#ffffff'
  primary-container: '#0b6b3a'
  on-primary-container: '#93e9ab'
  inverse-primary: '#84d99c'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#792a36'
  on-tertiary: '#ffffff'
  tertiary-container: '#97414c'
  on-tertiary-container: '#ffc9cc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ff5b7'
  primary-fixed-dim: '#84d99c'
  on-primary-fixed: '#00210d'
  on-primary-fixed-variant: '#00522a'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b8'
  on-tertiary-fixed: '#40000f'
  on-tertiary-fixed-variant: '#7b2b37'
  background: '#f7fbf3'
  on-background: '#181d19'
  surface-variant: '#dfe4dd'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
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
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 32px
  gutter: 24px
  margin-mobile: 16px
  row-height-compact: 40px
  row-height-standard: 56px
---

## Brand & Style

The design system is engineered for high-stakes governmental verification, balancing the authoritative weight of a national institution with the precision of modern enterprise software. The aesthetic is **Corporate Modern** with a focus on **Data Density** and **Functional Transparency**.

The UI must evoke unwavering trust. It achieves this through a disciplined "Security-First" layout—utilizing structured information hierarchies, sharp functional alignments, and a restrained use of color that reserves high-chroma accents strictly for semantic signaling and risk assessment. The experience should feel like a high-performance instrument: quiet, reliable, and exceptionally clear.

## Colors

The palette is anchored by the institutional Deep Green, serving as the primary touchpoint for identity and "Official" actions. 

- **Authority Layer**: Navy Blue (#1E293B) is reserved for structural persistence, such as the global sidebar or top-level navigation, creating a mental "frame" of security.
- **Surface Strategy**: The background is pure white (#FFFFFF), while secondary containers and data-heavy backgrounds use a subtle neutral gray (#F8FAFC) to reduce eye strain during long-form document review.
- **Semantic Logic**: Color is used as a data type. Statuses and fraud signals utilize the full semantic range. High-risk or escalated items use Purple (#7C3AED) to stand out from standard warning patterns, ensuring they are never overlooked.

## Typography

This design system utilizes **Inter** as its primary typeface to ensure maximum legibility across dense data tables and complex forms. 

- **Weight Discipline**: SemiBold (600) is used exclusively for headers and section titles to provide structural grounding. Medium (500) is the standard for functional labels and interactive elements. Regular (400) is used for body text and descriptive content.
- **Numerical Data**: For Case IDs and Verification Codes, a monospaced alternative (JetBrains Mono) may be used within table cells to ensure character alignment and prevent misreading.
- **Mobile Adaptivity**: Headlines scale down by roughly 20% on mobile devices, while body text remains consistent at 14-16px to maintain readability for field officers.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid** model. The main content area utilizes a 12-column grid with a maximum readable width of 1440px, centered on larger displays to maintain "Notion-level" focus and white space.

- **Grid**: 12 columns, 24px gutters.
- **Vertical Rhythm**: A strict 4px baseline grid ensures alignment between icons, text, and form inputs.
- **Table Density**: This design system prioritizes "Compact" views for primary case lists (40px row height) and "Spacious" views for individual case review pages (56px row height) where document legibility is paramount.
- **Breakpoints**: 
  - Mobile: < 640px (1 column, 16px margins)
  - Tablet: 640px - 1024px (6 columns, 24px margins)
  - Desktop: > 1024px (12 columns, 32px margins)

## Elevation & Depth

To maintain a professional, administrative feel, depth is created through **Tonal Layering** rather than heavy shadows.

- **Surface Levels**: The base application background is #F8FAFC. Active work surfaces (Cards, Table Containers) are #FFFFFF with a 1px border (#E2E8F0).
- **Shadows**: Level 1 (Soft) shadows are used only for floating elements like dropdowns or popovers (0px 1px 3px 0px rgba(0, 0, 0, 0.1)). Level 2 is reserved for active modals.
- **Interactivity**: Hover states are indicated by a subtle shift in background color (e.g., #F1F5F9) rather than an increase in elevation. This keeps the interface feeling "flat" and grounded.

## Shapes

The design system uses a **Soft (0.25rem)** roundedness approach. This creates a modern feel without appearing overly casual or consumer-focused.

- **Inputs & Buttons**: 4px (0.25rem) corner radius.
- **Cards & Sections**: 8px (0.5rem) corner radius for larger containers to create soft grouping.
- **Status Chips**: Fully rounded (pill-shaped) to distinguish them clearly from interactive buttons and static data containers.

## Components

### Risk & Status Indicators
- **Risk Badges**: High-contrast chips for fraud scores. Use background tints of the semantic colors with bolded text. High Risk (#7C3AED) must include a warning icon prefix.
- **Status Chips**: Standardized indicators (Approved, Review, Rejected, Pending). Use a subtle border and 10% opacity background of the semantic color for better integration into data tables.

### Data Management
- **Tables**: Use a 1px border-bottom for rows. Headers must be in all-caps `label-sm` with `neutral` text. Include sort icons on all metadata columns.
- **Audit Timelines**: A vertical 2px gray line with 12px circular nodes. Current status node uses `primary_color`, completed nodes use `success`, and pending nodes use `neutral-gray`.

### Inputs & Forms
- **Fields**: Use a 1px border (#CBD5E1). On focus, use a 2px `primary_color` border with no outer glow. Labels must always be visible above the input field in `label-md`.
- **Step Indicators**: Horizontal trackers for relocation stages. Use a "Completed/Active/Inactive" state logic with numeric indicators inside circles.

### Informational Widgets
- **Risk Explainability**: Small bar charts using semantic colors to show signal weights (e.g., "Hospital Credibility", "Document Authenticity"). Use `data-mono` for percentage values.
- **Summary Cards**: Information should be structured in two columns with labels on the left and values on the right in SemiBold to allow for rapid scanning.