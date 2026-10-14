# TCT Fashion Hub — Website & Admin Panel

A boutique **dress shop + craft academy** website for **TCT Fashion Hub**
(Ganapathy, Coimbatore — Since 2021):

- **Frontend:** React 18 + Vite — blue/orange brand system, glass nav, 3D mascot
- **Backend:** Node/Express API (JavaScript) — one backend only, no Python needed
- **Admin panel:** `/admin` — sign-in with scrypt-hashed + salted passwords, then
  edit the boutique, the classes and the enquiries with no rebuild

> **Single source of truth for the shop AND the classes: `backend/data/catalog.json`.**
> The admin panel writes it; the public pages poll `/api/catalog/version` and
> refresh themselves within ~10 seconds — no server restart, no rebuild.
> `backend/data/dresses.js` and `backend/data/pricing.js` are only the first-boot seed.

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Boutique hero + **dress flip cards with starting prices** (search, category filter, sort) |
| `/classes` | The craft classes: 6 single classes + 6 combos with live prices |
| `/about` | Studio story, leadership team (CEO & MD) |
| `/enquire` | Enquiry form (dress, class or combo) → WhatsApp + API |
| `/admin` | Private admin panel (noindex) — see below |

Every dress card is a flip card: the front carries the photo, category, name and
**starting price**; the back carries fabric, sizes, colours, the full price
range and one-tap WhatsApp/call buttons.

## Boutique catalogue (seeded)

| Dress | Category | From (Rs) |
| --- | --- | --- |
| Cotton Aari Kurti | Kurti & Tops | 899 |
| Kanchipuram Soft Silk Saree | Saree | 3,499 |
| Bridal Aari Lehenga | Lehenga | 15,999 |
| Custom Silk Blouse | Blouse | 749 |
| Embroidered Anarkali Gown | Gown | 4,999 |
| Kids Pattu Frock | Kids Wear | 1,299 |
| Hand-Worked Georgette Dupatta | Dupatta | 999 |
| Resin Art Jewellery Set | Jewellery | 399 |

The starter photos are brand-coloured fashion sketches
(`public/images/dresses/`, regenerate with `npm run dress:art`). Replace them
with real product photos from the admin panel — upload (PNG/JPEG/WebP, under
3 MB) or paste an image URL.

## Admin panel — `/admin`

**First-boot account: `admin` / `Tct@Admin2026`** (change it in *Settings*; the
panel keeps warning until you do). Override the first-boot values in `.env` with
`ADMIN_USERNAME` / `ADMIN_PASSWORD` before the first run — they are used only
while no admin exists yet.

| Tab | What you can do |
| --- | --- |
| **Boutique** | Add / edit / hide / delete dresses, set starting + highest price and MRP, badge, fabric, sizes, colours, description, upload a photo, mark featured |
| **Classes** | Edit single-class fees and combo prices, kit gifts, duration, level, photos; add or hide classes |
| **Enquiries** | Every website/assistant enquiry; tap-to-call, WhatsApp, and a status flow (new → contacted → enrolled → closed) |
| **Settings** | Change password, see how sign-in is protected, restore the starter catalogue |

### How sign-in is protected

- Passwords are stored **hashed + salted**: `scrypt` (N=16384, r=8, p=1) with a
  random **16-byte salt** per account and a 64-byte key — in
  `backend/data/admins.json`. No plain-text password is ever written, logged or
  returned by the API.
- Verification re-derives the key and compares with `crypto.timingSafeEqual`
  (constant time), so response time cannot leak a partial guess.
- The signed-in state is an opaque 32-byte session token in an **HttpOnly**
  cookie (8-hour life) — nothing sensitive is kept in `localStorage`. Sessions
  are persisted server-side so a dev-server restart does not sign you out.
- 5 wrong attempts per username + IP → 15-minute lockout. Mutations additionally
  require the same-origin `x-tct-admin` header (CSRF guard), and reading
  enquiries now requires a session at all.
- Locked out? Delete `backend/data/admins.json` and restart the server — a
  fresh account is created and printed in the console.

## SEO

## Class pricing (Rs) — REAL DATA (from backend/data/pricing.js)

| Class | Price | Duration |
| --- | --- | --- |
| Tailoring | 8,000 | 1 Month |
| Embroidery | 7,000 | 1 Month |
| Aari Work | 7,000 | 1 Month |
| Jewellery Making | 6,000 | 1 Month |
| Mehndi | 4,000 | 1 Month |
| Saree Pre-Pleating | 2,000 | 1 Month |

## Combos (Rs) — REAL DATA

| Combo | Price |
| --- | --- |
| Signature Combo — All 7 Crafts | 25,000 |
| Embroidery + Aari | 15,000 |
| Saree + Mehndi | 10,000 |
| Tailoring + Embroidery | 20,000 |
| Tailoring + Aari + Embroidery | 23,000 |
| Saree + Jewellery + Resin Art | 22,000 |

## Leadership

| Name | Role |
| --- | --- |
| Bharath T | Chief Executive Officer (CEO) |
| Mohanapriya K | Managing Director (MD) |

Photos live in `public/images/leadership/`.

## UPI payment setup (optional)

The Pay Now modal shows a **"Pay with UPI app"** button and a scan-and-pay QR
only when a UPI ID is configured.

1. Create a file named `.env` in the project root (next to `package.json`).
2. Add this line with your UPI ID (Google Pay / PhonePe / any UPI app):

   ```
   VITE_UPI_ID=tctfashionhub@okicici
   ```

   (Replace with your real UPI ID — the part after `@` depends on your bank/app.)
3. Restart `npm run dev`.

Without `.env`, the modal still works — WhatsApp and Email payment options remain.

## SEO

Per-route titles/descriptions/canonical are applied by `src/lib/useSeo.js`
(`/classes` and `/enquire` each have their own), the admin panel is served
`noindex, nofollow`, and `index.html` ships ClothingStore + EducationalOrganization
+ LocalBusiness JSON-LD (address, geo, opening hours, price range, socials).
The home page injects a **Product** list built from the live catalogue and
`/classes` injects a **Course** list built from the live prices, so Google's rich
results always match what shoppers see.

1. When the production domain is decided, add it once:

   ```bash
   # .env
   VITE_SITE_URL=https://tctfashionhub.in
   ```

2. `npm run build` then automatically generates `robots.txt` + `sitemap.xml`
   (home, `/classes`, `/about`, `/enquire` — never `/admin`) and injects absolute
   `canonical` / `og:url` / `og:image` tags into the built `dist/index.html`
   (social crawlers don't run JavaScript). Switching the domain back off strips
   them again, so the script is safe to re-run.

3. Verify any time with:

   ```bash
   npm run build && npm run seo:check   # 18 checks now, 28 once the domain is set
   ```

## Run it

```bash
npm install
npm run dev
# Node API  → http://localhost:5000
# React app → http://localhost:5173   (the Vite proxy sends /api to the Node API)
```

### Production build

```bash
npm run build
node backend/server.js   # serves the built site + API on http://localhost:5000
```

## API endpoints (Node, port 5000)

**Public**

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | service check |
| GET | `/api/catalog/version` | tiny change token the pages poll for live updates |
| GET | `/api/dresses`, `/api/dresses/:id` | boutique collection / one dress |
| GET | `/api/classes`, `/api/classes/:id`, `/api/combos`, `/api/pricing`, `/api/studio` | classes & studio details |
| POST | `/api/enquiries` | website + assistant enquiries (rate limited) |

**Admin** (session cookie; mutations also need the `x-tct-admin: 1` header)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/admin/login`, `/api/admin/logout` | sign in / out |
| GET | `/api/admin/session` | quiet session probe for the SPA |
| POST | `/api/admin/password` | change password |
| GET/POST/PUT/DELETE | `/api/admin/dresses[/:id]` | boutique CRUD |
| POST | `/api/admin/dresses/reorder` | reorder the collection |
| GET/POST/PUT/DELETE | `/api/admin/classes/:kind[/:id]` | classes & combos CRUD (`kind` = `single` \| `combo`) |
| GET/PATCH | `/api/admin/enquiries[/:id]` | read enquiries, set status |
| POST | `/api/admin/uploads` | save an uploaded product photo (PNG/JPEG/WebP, ≤3 MB) |
| POST | `/api/admin/catalog/reset` | restore the seeded catalogue |

Reading enquiries (`GET /api/enquiries`) is admin-only — customer names and
phone numbers never leave the server without a session.

## Project layout (the parts that matter)

```
backend/
  server.js              Express API + admin routes + uploaded-photo hosting
  lib/auth.js            scrypt hash + salt, sessions, lockout, CSRF guard
  lib/catalog.js         dresses + classes store (catalog.json), versioning
  lib/enquiries.js       enquiry store + validation
  data/dresses.js        seed boutique    ─┐ copied into catalog.json on the
  data/pricing.js        seed classes     ─┘ very first boot only
src/
  components/DressFlipCard.jsx   the flip card (front: price, back: details)
  components/DressShop.jsx       search + filter + sort + grid
  pages/admin/AdminPage.jsx      sign-in gate + dashboard
  components/admin/*             boutique / classes / enquiries / security
  lib/shop.js                    public API + live-catalogue polling hook
  lib/admin.js                   admin API client (cookie session)
```
# tctfashionhub
