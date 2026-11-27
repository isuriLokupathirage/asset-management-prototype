# Access360 Asset Management: Prototype

An independent, frontend-only demonstration of the legacy Access360 Asset Management module, restyled to the current Access360 design direction. It uses dummy data and mock services. There is no backend, no authentication and no permission model.

## Run it

```powershell
npm install
npm run dev        # http://localhost:5180
```

Other scripts: `npm run build` (type-check and production build), `npm run typecheck`, `npm run lint`.

Demo changes persist in the browser (`localStorage`). Use the reset button at the bottom of the sidebar to restore the original dataset.

## What is covered

Based on the legacy source (`Accxis360.App/src/asset-management`, `Accxis360.Api/src/asset-management`).

| Area | Screens and behaviour |
|---|---|
| Dashboard | Totals and availability for the four inventory kinds, assets by status, new items by month, expiring EOL and licenses (7/30/90 days), low stock, open maintenance, recent activity |
| Inventory: Assets, Licenses, Components, Accessories | List with search, filters, sort, pagination, CSV export. Create (with individual records, tag generation from the asset type pattern, custom fields), edit, delete with in-use guards. Detail page with Details, Individual records, Assignments, Assigned items (assets), Maintenance History (assets) and History tabs |
| Assign / Return | Assign an individual record to a user or to another asset. Return with condition and notes. Printable handover and return form |
| Asset status and maintenance | Status labels with types. Changing to *Under Maintenance* requires a repair agent and date and opens a maintenance record. Leaving it completes the record. Records are edited, completed or cancelled on the asset's Maintenance History tab |
| User assignments | People with holdings per kind, per-user current and returned items, "Assign item" from the user page, **My Assignments** |
| Settings | Companies, Departments, Categories, Manufacturers, Suppliers and repair agents, Asset Models, Asset Types (tag patterns), Status Labels, Custom Fields, Field Sets |

## Business rules reproduced from the legacy backend

- Only individual assets whose status label type is **Deployable** and which are not already assigned can be assigned.
- An item is assigned to exactly one of: a user, or an individual asset. Not both.
- An assigned asset cannot move to Retired, Archived, Undeployable or Pending until it is returned. An asset that is Retired or Archived cannot be returned until its status is corrected.
- Entering Under Maintenance needs a repair agent and maintenance date. Leaving it completes the open maintenance record.
- Assigned individual records cannot be deleted. A record with assigned items, or that other items are assigned to, cannot be deleted.
- Asset tags and serial numbers are unique. Tags must match the asset type's pattern (`LAP-XXX`). The asset type must belong to the selected company. Names are unique per kind.
- Lookups (company, category, model, status label and so on) cannot be deleted while in use.

## Structure

```
src/
  types.ts               domain model
  data/seed.ts           realistic, interconnected demo data
  services/domain.ts     pure business operations (db in, db out, or ServiceError)
  store/AppStore.tsx     state, localStorage persistence, simulated latency
  components/ui          Access360 design primitives
  components/layout      shell, sidebar, page header
  components/inventory   forms and workflow drawers
  pages/                 dashboard, inventory, assignments, maintenance, settings
```

To connect a real API, replace the operations in `services/domain.ts` that `AppStore.run` calls. The screens only know the `run(op, message)` contract.

## Notes

- Visual language (palette, Inter, sidebar, cards, drawers, badges, tables) follows the Onboarding and Offboarding prototype. Nothing is imported from it and it was not modified.
- See [ASSET_MANAGEMENT_REINTRODUCTION_NOTES.md](ASSET_MANAGEMENT_REINTRODUCTION_NOTES.md) for production considerations and what was simplified.
