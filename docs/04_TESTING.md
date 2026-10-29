# Verification protocol

## Required checks per phase
1. Fresh environment setup with documented commands.
2. `python manage.py check` and `python manage.py check --deploy` when production settings are configured.
3. `python manage.py makemigrations --check --dry-run` and `python manage.py migrate`.
4. `pytest` for backend tests; coverage targets established per critical module.
5. API contract and authorization tests including unauthorized/forbidden cases.
6. Playwright browser checks for desktop 1440px, tablet 768px and mobile 390px; save screenshots.
7. Mobile unit/component tests and Expo smoke test; device test for affected flows.
8. Accessibility review: keyboard navigation, contrast, focus, labels, errors.
9. Regression tests for inventory, payments and permissions.
10. Record commit SHA, commands, results, screenshots, known limitations and approval in a verification report.

Commands above are targets once the project dependencies and test configuration are created; do not mark them passed in advance.

## Verification report template
Phase: | Commit: | Date: | Environment: | Automated tests: | Manual cases: | Screenshot paths: | Security checks: | Failures: | Decision: PASS/BLOCKED | Reviewer:

## Acceptance rule
No next phase until mandatory checks pass and any limitations are documented and accepted.
