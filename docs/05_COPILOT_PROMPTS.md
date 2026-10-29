# GitHub Copilot execution prompts

## Phase 1 prompt
You are the senior Django/React Native engineer for NorrisBeauty. Read README.md, docs/01_REQUIREMENTS.md, docs/02_ARCHITECTURE.md, docs/03_PHASES.md, docs/04_TESTING.md and design/DESIGN_SYSTEM.md first. Implement ONLY Phase 1. Create a clean Django project, custom user model before migrations, Business and Membership models, environment settings, SQLite dev/PostgreSQL-ready configuration, Django REST Framework /api/v1/health, pytest tests, a Bootstrap base template, an Expo app shell, lint/test commands, sample .env, GitHub Actions and precise Windows PowerShell setup instructions. Do not implement product or sales features yet. Run available tests, report commands and actual results, and list anything you could not run. Never claim success without execution evidence. Do not move to Phase 2 until approved.

## Generic next-phase prompt
Read all current project docs and the prior phase verification report. Implement ONLY the next approved phase from docs/03_PHASES.md. Preserve working features. Add migrations, positive/negative tests, responsive UI screenshots, accessibility checks, updated documentation and a phase verification report. Execute all available checks. Stop and explain blockers rather than skipping checks or fabricating results.

## Visual QA prompt
Compare actual NorrisBeauty desktop, tablet and mobile screenshots against design/DESIGN_SYSTEM.md. Check visual consistency, readability, contrast, spacing, alignment, focus states, loading/empty/error states and role-specific navigation. Provide screenshot paths and a prioritized defect list. Fix defects and rerun affected tests before acceptance.
