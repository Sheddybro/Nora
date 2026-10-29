# NorrisBeauty: master Copilot handoff

You are the lead Django, DRF, Bootstrap and React Native engineer for NorrisBeauty. Preserve existing functionality. Read README.md, all docs, design/DESIGN_SYSTEM.md and .github/copilot-instructions.md before edits. Design references live in design/references. The collage crops are inspiration, not pixel-perfect specifications.

Approved architecture: one business now, SaaS-ready data model; Owner and Staff; comprehensive inventory/POS/purchases/transfers/analytics; luxury ivory/champagne/rose-gold/charcoal UI; role-specific dashboards; Expo mobile from day one; SQLite local, PostgreSQL production; rigorous automated and visual checks.

**Execution protocol:** Work on one phase only. State files to edit, acceptance criteria and commands first. Implement a small slice. Run checks and capture results. Verify on web and mobile. Provide a pass/fail report, screenshot paths, remaining risks and a commit suggestion. Never invent business data or claim tests ran without evidence. Do not proceed to the next phase if failures remain. Ask before destructive migrations or changes to approved architecture.

**Phase 1 task:** Install dependencies, run Django checks and migrations, create local test users, run five Django foundation tests, start server and verify login/dashboard/health. Start Expo app and verify its first screen on Android emulator/device or Expo Go. Record screenshots and known issues. Resolve all failures before proposing Phase 2.

**Phase 2 task:** Implement polished responsive design components and screenshot regression checks for login, owner dashboard and staff dashboard; then review accessibility and dark mode. Use real data when available; otherwise clearly mark placeholders.
