# Nozha / KARAZ Price Studio

The existing Arabic/English pricing and offers interface, assets, Excel import, barcode tools, PDF export and print layouts are deployed on Vercel without interface changes.

## Deployment

Connect this repository to the `nozha-price-studio` Vercel project. Framework: Other; output directory: `public`; no build step or package installation required. `api/bridge.js` provides same-origin access to the existing shared catalog and offers service.

## Migration status

Frontend and deployment source are migrated to GitHub/Vercel. The persistent D1 database and original catalog/offer service remain on the existing Sites deployment. Keep that deployment enabled. This is a staged hosting migration, not a completed database migration. No database rows or credentials are included in this repository.

`worker/`, `db/` and `drizzle/` retain the original API source and database schema for the later database migration. Before replacing the bridge, provision persistent storage, export and import all products/offers, preserve version conflict checks and atomic batches, and verify shared reads/writes before switching over.

Browser-local unsaved drafts belong to the old domain and are not transferred automatically; export any such drafts before changing links.

## Regular-price library capacity

The shared products table has no product-count ceiling. The browser reads only 30 matches at a time and can jump directly to any result page. `npm run test:catalog` exercises the actual catalog API against an isolated SQLite database with 30,000 products, including the final page, Arabic search, indexed barcode lookup, a 30,001st save, duplicate handling and version-conflict checks. This is a local scale and correctness check; it does not measure hosted quotas, network latency or production concurrency. No test products are inserted into the shared library.

## Desktop app

PriceDesk Studio can be installed as a standalone desktop web app in supported browsers. The header's Install app button opens the native prompt when available, with browser-menu guidance otherwise. The manifest uses stable app identity `/` and 192/512 PNG icons. The shared library requires an internet connection. The service worker caches only an offline notice; it never caches product API responses or app HTML and never queues price writes. No automatic page reload interrupts an active print job.

## Startup performance

PDF, camera scanning, ZIP and spreadsheet compatibility libraries load only when used. This reduces initial uncompressed script bytes from 2,402,739 to about 295,000 (88% less initial JavaScript, not a measured 88% latency improvement). Shared prices remain network-only and are rechecked before a product is added. The offers library refreshes only when its workspace is active; server date and expiry checks still run before printing. Run `npm run test:assets` to check loader deduplication and retry behavior.
