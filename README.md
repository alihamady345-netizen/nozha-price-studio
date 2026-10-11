# Nozha / KARAZ Price Studio

The existing Arabic/English pricing and offers interface, assets, Excel import, barcode tools, PDF export and print layouts are deployed on Vercel without interface changes.

## Deployment

Connect this repository to the `nozha-price-studio` Vercel project. Framework: Other; output directory: `public`; no build step or package installation required. `api/bridge.js` provides same-origin access to the existing shared catalog and offers service.

## Migration status

Frontend and deployment source are migrated to GitHub/Vercel. The persistent D1 database and original catalog/offer service remain on the existing Sites deployment. Keep that deployment enabled. This is a staged hosting migration, not a completed database migration. No database rows or credentials are included in this repository.

`worker/`, `db/` and `drizzle/` retain the original API source and database schema for the later database migration. Before replacing the bridge, provision persistent storage, export and import all products/offers, preserve version conflict checks and atomic batches, and verify shared reads/writes before switching over.

Browser-local unsaved drafts belong to the old domain and are not transferred automatically; export any such drafts before changing links.
