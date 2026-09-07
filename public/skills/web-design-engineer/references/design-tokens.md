# Design Tokens & Layout Standard

## Spacing & Grid System
- Standard 8pt Grid: 4px (`0.5`), 8px (`1`), 12px (`1.5`), 16px (`2`), 24px (`3`), 32px (`4`), 48px (`6`), 64px (`8`), 96px (`12`).
- Max Content Widths:
  - Mobile: `100%` with `16px` padding
  - Tablet: `720px`
  - Desktop: `1200px` (or `1440px` wide)

## Responsive Breakpoints
- Mobile: `< 640px`
- Tablet: `640px - 1024px`
- Desktop: `> 1024px`

## Typography Ratios
- Major Third (1.25) or Perfect Fourth (1.33) scale:
  - Hero Headline: 48px - 64px (clamp: `clamp(2.5rem, 5vw, 4rem)`)
  - Section Headline (H2): 32px - 40px
  - Card Title (H3): 20px - 24px
  - Body Copy: 15px - 16px with line-height 1.6 (`leading-relaxed`)
  - Micro / Meta: 12px - 13px (`text-xs` / `text-sm`)

## Contrast & Accessibility
- WCAG AA minimum 4.5:1 for normal text, 3:1 for large text.
