# F15 UX polish (only after every P0 frontend chunk is done)

Depends: F05 to F14. Priority: P1. Read first: ARCHITECTURE.md section 4.

## Goal

Raise clarity and trust without adding features.

## Tasks

- [x] Every screen has loading skeletons, empty states, error states with retry, and forbidden states; audit each route against the four-state rule
- [x] Keyboard navigation and focus order checked on dialogs, drawers and tables; visible focus rings; ARIA labels on charts (provide a text summary and the weekly table as an accessible alternative)
- [x] Responsive layouts verified at 390, 768 and 1280 px widths; wide tables scroll inside their container, never the page
- [x] Consistent number formatting (tabular figures), date formatting, and plain-language copy review (no jargon without a tooltip)
- [x] Demo hints: dismissible "Demo guide" panel on the dashboard listing the story steps and the three demo accounts (emails only)
- [x] Plain-language toggle available on the dashboard and agent (P1) if not already done
- [x] Performance pass: lazy-load charts, avoid duplicate queries, check bundle size of the app shell
- [x] Dark mode check on all charts
- [x] Master plan row F15 set to `[x]`
