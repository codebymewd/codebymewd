# Code by Me (CBM) — Public Website (Phase 1)

Customer-facing website, template marketplace, and order flow for Code by Me.
Plain HTML/CSS/JavaScript (ES modules), Firebase Firestore as the backend,
Cloudinary for all media uploads. No build step required.

## 1. What's in here

```
index.html               Home
about.html                About
services.html             Services
projects.html             Projects list + single-project view (?id=)
templates.html            Templates marketplace
template-details.html     Template details, packages, purchase
apps-software.html        Apps & Software — Coming Soon
contact.html               Contact form
check-order.html          Order status lookup
checkout.html             Customer info → payment → order creation
css/style.css              Global design system
js/firebase-config.js     Firebase init (fill in your project keys)
js/cloudinary-config.js   Cloudinary unsigned-upload helper (fill in cloud name)
js/common.js               Shared header/footer, toasts, order-ID + WhatsApp helpers
js/*.js                    Per-page logic
firestore.rules            Security rules for this phase
```

## 2. Before you deploy

1. **Firebase**: create a project, enable Firestore, and paste your web app's
   config into `js/firebase-config.js` (the six `REPLACE_WITH_...` values).
   These values are not secret — they identify the project. Publish
   `firestore.rules` via the Firebase console or CLI (`firebase deploy --only firestore:rules`).
2. **Cloudinary**: create an account, then in Settings → Upload → Upload
   presets, add an **unsigned** preset (see the comment at the top of
   `js/cloudinary-config.js`). Put your cloud name and preset name into that
   file. Unsigned presets are the standard, secret-free way to upload from
   the browser — no API secret is ever shipped to the frontend.
3. **Seed `settings/general`** in Firestore with your bank details so the
   Checkout page has something to show:
   ```json
   {
     "businessName": "Code by Me",
     "motto": "Build. Simplify. Grow.",
     "whatsapp": "2349053047349",
     "email": "codebymewd@gmail.com",
     "telegram": "@codebymewd",
     "paymentDetails": {
       "bankName": "...",
       "accountName": "Code by Me",
       "accountNumber": "...",
       "instructions": "Transfer the exact amount shown, then upload your screenshot."
     }
   }
   ```
4. **Add at least one template** to the `templates` collection (see schema
   below) so Templates/Home aren't stuck on the empty state.
5. Serve the folder over HTTP(S) (Firebase Hosting, Netlify, or any static
   host) — ES modules don't load from `file://`.

## 3. Firestore data model

- **templates** — `active` (bool, must be true to show publicly), `featured`,
  `name`, `slug`, `description`, `price`, `technologies[]`, `features[]`,
  `previewImage`, `screenshots[]`, `promoVideo`, `livePreview`,
  `packages[]` (each `{id, name, price, includes[]}` — defaults to a single
  "Template Only" package built from `price` if omitted), `adminDashboardType`
  (`"hosted"` or `"installable"`), `hostedType` (`"static"` or `"custom"`,
  only read when `adminDashboardType` is `"hosted"`), `apiRequired` (bool),
  `apiService[]`, `apiSetupPrice`, `setupAvailable` (bool), `setupPrice`,
  `setupDocumentation` (URL), `createdAt`, `updatedAt`.
- **projects** — `title`, `description`, `category`, `technologies[]`,
  `thumbnail`, `screenshots[]`, `video`, `liveDemo`, `github`, `status`,
  `featured`, `createdAt`.
- **orders** — document ID **is** the generated Order ID (e.g. `CBM-8F42K`),
  written once by the customer at checkout with status
  `Awaiting Verification` / `Payment Submitted`. Everything else (status
  changes, decline reasons) is intended to be edited by the future Owner
  Dashboard, which is why `update`/`delete` are closed to the public in
  `firestore.rules`.
- **contactMessages** — write-only from the public site; only the future
  Owner Dashboard reads these back.
- **settings/general** — a single document with business + payment info.

## 4. Order lookup — the security tradeoff, explained

There's no customer login in Phase 1, so "Check Order" works the way most
manual-payment stores do it: the Order ID is a random, unguessable code
(`CBM-` + 6 random characters from a 32-character set, ~30 bits of entropy),
and `check-order.js` also confirms the email on the order matches what the
customer typed before showing anything. Firestore rules only allow `get`
(a single document by exact ID) and never `list`, so an order can't be
browsed or enumerated. This is a reasonable bar for a manual-transfer store;
if you want stronger guarantees later, Phase 2 can move the email check into
a Cloud Function or add lightweight customer auth.

## 5. What's intentionally not built yet (Phase 2)

- CBM Owner Dashboard (managing templates/projects/orders/settings)
- Any admin login
- Flutterwave or any automatic payment verification
- Outbound emails (the architecture — order data, status field, templateName,
  etc. — is already shaped so a Cloud Function can send
  "Order Received" / "Order Confirmed" emails once it's added)
- Customer accounts, subscriptions, domain registration

## 6. Design notes

Palette: near-black (`#0B0C0E`), signal yellow (`#F4C10F`), white/paper.
Display type is Space Grotesk, body text is Inter. Cards use thin borders
rather than heavy drop shadows; yellow is reserved for accents (buttons,
badges, code highlights) rather than large fills, so it reads as a brand
mark rather than decoration.
