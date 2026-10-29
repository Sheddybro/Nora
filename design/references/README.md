# NorrisBeauty Visual Reference Pack

This folder contains a concept board and cropped reference panels for GitHub Copilot. All panels are **visual inspiration**, not exact implementation screenshots or pixel-perfect specifications. Small text, data, and labels may be inaccurate or illegible; use documented requirements and realistic test data instead.

## Usage rules
- Treat `00_full_design_board.png` as the primary visual reference.
- Match the approved ivory, champagne, rose-gold and charcoal theme across web and mobile.
- Use Django templates + Bootstrap for web and React Native/Expo for mobile; do not embed these screenshots as app interfaces.
- Recreate each screen with real accessible controls, responsive layouts, and reusable components.
- The small bottom-row crops are particularly low resolution and should be treated as layout thumbnails only.
- Do not copy placeholder metrics, fake customer names, prices, or dates as production facts.
- Test all screens at desktop, tablet and phone widths; validate actual flows and capture fresh implementation screenshots.

## Suggested UI acceptance criteria
1. Owner and staff see appropriate role-based dashboards.
2. Sidebar, top bar, cards, forms, tables and buttons share design tokens.
3. Product and POS screens remain usable at mobile widths without horizontal clipping.
4. Mobile navigation is touch-friendly; checkout can be completed end-to-end against the API.
5. Dark mode has adequate contrast and does not change permissions or business logic.
6. All displayed data comes from API or clearly labeled demo fixtures.
