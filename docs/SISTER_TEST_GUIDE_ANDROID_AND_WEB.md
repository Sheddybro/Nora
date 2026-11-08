# NorrisBeauty Test Guide

**For:** Android-first tester
**Environment:** Private test deployment and disposable SQLite demo
**Website:** <https://norissbeautyquest.pythonanywhere.com/>
**Android package:** Use the **Download Android APK** button on the website login page. It opens the APK in Google Drive.

Thank you for helping test NorrisBeauty. Please focus on whether the app is understandable and reliable on your Android phone. The website is included so you can compare that the same business data appears in both places.

## Before you start

- Ask the app owner for a **separate test username and password**. Do not put credentials in this document, screenshots, or chat messages.
- The account needs an active **Owner or Staff membership** in the test business. A Django superuser/admin account by itself cannot sign in to the mobile app.
- Use only test entries and products the owner has approved. This deployment uses disposable SQLite; it may be reset and is not for real customer, sales, or business data.
- The same test business is shared by the website and mobile app. A sale, receipt, stock adjustment, or customer added in one may appear in the other.
- Do not enter real payment-card/bank details. Checkout records a payment method for testing; it does not process a real payment.
- If an action would change stock or record a sale, do it only after the owner confirms the test product and quantity to use.
- Stop and tell the owner if the app shows another business's data, reports success after an error, or changes stock unexpectedly.

## Test session details

Fill in what you can; do not record passwords or access tokens.

- Date/time:
- Tester:
- Android phone model and Android version:
- App version shown on the phone (if available):
- Account role: Owner / Staff:
- Website tested: Yes / No:
- Network: Wi-Fi / mobile data:

## Android app tests — do these first

For each item, mark **Pass**, **Issue**, or **Blocked**, and add a short note.

### 1. Open and sign in

- [ ] App opens without crashing or remaining on a blank/loading screen.
- [ ] Username and password fields are clear; password is hidden by default.
- [ ] Show/Hide password changes visibility without clearing the password.
- [ ] Sign in with the test account and reach the app's main screen.
- [ ] Bottom tabs open: Overview/Today, Catalog, Sell, Stock, and More.
- [ ] Sign out, then sign back in successfully.

Do not repeatedly guess passwords; several failed logins can temporarily trigger a security limit.

### 2. Overview

- [ ] Overview/Today opens and can be scrolled.
- [ ] Any period buttons (Week, Month, Year) respond.
- [ ] The screen remains readable when the phone keyboard is open and after rotating the phone.

Note: this demo has a known open question about how inventory value and sale costs are calculated. Report confusing or inconsistent totals, but do not use the figures as audited accounting.

### 3. Catalog

- [ ] Catalog loads and shows the available test products.
- [ ] Search by a product name or SKU; try a term that should not match.
- [ ] If the owner provides a test barcode, enter it as text and try Find; try an unknown code too.
- [ ] Confirm the app gives visible feedback for a match, no match, or connection error.

Barcode entry is text/keyboard-wedge lookup. Camera barcode scanning is not implemented.

### 4. Stock

- [ ] Stock opens and displays the available products and locations.
- [ ] If there are multiple locations, switch/check them and note whether quantities make sense.
- [ ] Compare the same product/location with the website's **Inventory** page.
- [ ] Do not adjust stock unless the owner has identified a test product and approved the amount.

If an adjustment test is approved, record the starting quantity first, make only the agreed small change, confirm the updated quantity on both mobile and web, and tell the owner what you changed. Do not try to force a negative quantity.

### 5. Sell / POS

- [ ] Select the test location and add an in-stock test product.
- [ ] Increase/decrease quantity; check that quantity cannot exceed available stock.
- [ ] Remove the item and confirm the basket becomes empty; add it again.
- [ ] **Only if the owner approves:** complete one small test sale with the agreed item and payment method.
- [ ] Record the invoice/reference shown. Check that the basket clears only after success and stock reduces once.
- [ ] On the website, open **Sales history** and **Inventory** and check for the same sale and stock change.

Checkout requires an internet connection. Do not submit a sale twice just because a screen appears slow; ask the owner to check Sales history first.

### 6. More and Customers

- [ ] Open **More** and try the links visible for your account.
- [ ] Customers: search for an owner-provided test entry and try a no-match search.
- [ ] **Only if approved:** create a clearly test-only customer (for example, `QA Sister Test`); do not enter a real person's contact details.
- [ ] If you sign in as Staff, confirm Owner-only sections are not shown or do not allow access.

Owners see additional tools such as Purchases, Reports, Staff, and Settings. Staff normally see fewer tools. If a link is missing, record your role; it may be expected permission behavior.

### 7. Offline stock queue (optional, Owner-approved only)

- [ ] Do this only if the owner approves a small adjustment on a designated test product.
- [ ] Turn off network, submit the approved stock movement, and note the queued status.
- [ ] Restore network and leave the app open/bring it back to the foreground.
- [ ] Confirm the movement reports as synced and appears once in web Inventory.

Only stock movements have a foreground retry queue. Sales/POS do not work offline. Background sync is not guaranteed. If you are unsure, skip this test.

## Website checks — secondary

Open <https://norissbeautyquest.pythonanywhere.com/> and sign in with the same test account (or the separate web account provided by the owner).

- [ ] Login and logout work.
- [ ] Products/Catalog and Inventory pages open.
- [ ] POS opens; do not complete another sale unless approved.
- [ ] Sales history shows the approved test sale, if one was made.
- [ ] Customers shows only the test business's entries.
- [ ] Owner/Staff access matches the account role.
- [ ] A mobile action you performed is reflected on the web, and vice versa where appropriate.

Report a broken page, unclear message, layout issue, or data mismatch. Do not try to bypass a permission screen.

## How to report a problem

Send the owner:

1. Step number and screen name.
2. Result: Pass / Issue / Blocked.
3. What you did, and what you expected versus what happened.
4. Phone model, Android version, app role, and whether you were on Wi-Fi/mobile data.
5. A screenshot or short screen recording if useful. **Before sharing, hide names, emails, phone numbers, passwords, tokens, and any non-test business data.**
6. If it concerns stock or a sale, include the test product/location and before/after quantity or invoice reference. Never include a password or access token.

### Notes

| Step/screen | Pass / Issue / Blocked | What happened / expected result |
|---|---|---|
| | | |
| | | |
| | | |

## Known limits

- This is a private demo, not a production service. Do not rely on it for real business records.
- No real payment gateway is connected.
- Camera barcode scanning is not available; barcode text lookup is.
- POS requires a live connection. Offline retry is limited to stock movements while the app is active/foregrounded.
- Full native-device acceptance is still in progress. Your observations are valuable, including a clear “Blocked” result when something cannot be tested.
