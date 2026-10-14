# F15 UX polish (only after every P0 frontend chunk is done)

Depends: F05 to F14. Priority: P1. Read first: ARCHITECTURE.md section 4.

## Goal
Raise clarity and trust without adding features.

## Tasks
- [ ] Every screen has loading skeletons, empty states, error states with retry, and forbidden states; audit each route against the four-state rule
- [ ] Keyboard navigation and focus order checked on dialogs, drawers and tables; visible focus rings; ARIA labels on charts (provide a text summary and the weekly table as an accessible alternative)
- [ ] Responsive layouts verified at 390, 768 and 1280 px widths; wide tables scroll inside their container, never the page
- [ ] Consistent number formatting (tabular figures), date formatting, and plain-language copy review (no jargon without a tooltip)
- [ ] Demo hints: dismissible "Demo guide" panel on the dashboard listing the story steps and the three demo accounts (emails only)
- [ ] Plain-language toggle available on the dashboard and agent (P1) if not already done
- [ ] Performance pass: lazy-load charts, avoid duplicate queries, check bundle size of the app shell
- [ ] Dark mode check on all charts
- [ ] Master plan row F15 set to `[x]`
