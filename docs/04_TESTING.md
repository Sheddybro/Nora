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

## Desktop PWA checks

- Run the focused Django PWA tests and `manage.py check`; verify the manifest icons resolve and the service worker controls the root scope.
- In desktop Chromium, confirm the standalone manifest and install prompt behavior; do not claim a native desktop install from a synthetic prompt event.
- Save a snapshot from live catalog/inventory API responses, confirm IndexedDB stores ciphertext only, and check that prices, costs, and API responses are absent from offline storage.
- Disconnect the browser and navigate to another business page; it must show only the offline shell. Unlock with the separate passphrase, confirm read-only catalog/stock filtering, and verify lock, expiry, and logout deletion.
- Inspect Cache Storage to confirm that static assets are cached and no `/api/` paths or authenticated pages are present. Capture desktop and narrow-screen screenshots.
- The PWA requires a secure context (HTTPS or localhost). Offline access is limited to the last saved snapshot and cannot detect a membership revocation until reconnection or expiry.

Commands above are targets once the project dependencies and test configuration are created; do not mark them passed in advance.

## Verification report template
Phase: | Commit: | Date: | Environment: | Automated tests: | Manual cases: | Screenshot paths: | Security checks: | Failures: | Decision: PASS/BLOCKED | Reviewer:

## Acceptance rule
No next phase until mandatory checks pass and any limitations are documented and accepted.
