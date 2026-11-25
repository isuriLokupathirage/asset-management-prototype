# Asset Management: Reintroduction Notes

Technical considerations for bringing Asset Management back into the live Access360 application. **Confirmed** items were read directly in the source; **Assumptions** were inferred and should be verified.

Sources: `Accxis360.Api/src/asset-management`, `Accxis360.App/src/asset-management` and `src/app/asset-management`. Nothing in those repositories was changed.

## 1. Existing architecture (confirmed)

- **Backend:** Node/Express with Mongoose. Layered as routes → controllers → services → repositories, with validators and typed errors. Mounted from `src/asset-management/index.ts`.
- **Frontend:** Next.js App Router (`src/app/asset-management/*` pages are thin; logic lives in `src/asset-management/components`). TanStack Table, Radix UI primitives, Tailwind, custom form sections, `jspdf` for the handover form, Excel import/export utilities.
- **Domain:** four inventory kinds (Assets, Licenses, Components, Accessories). Each parent record owns an array of *individual* records (tag, serial, status) and embedded `currentAssignments` / `assignmentHistory`. Assets additionally own `maintenanceHistory`. An item can be assigned to a user or to an individual asset (`assignedToAsset` + `individualAssetId`).
- **Lookups:** Company, Department, Category, Manufacturer, Supplier (supplier and/or repair agent), Model (with depreciation, fieldset), AssetType (tag pattern with `XXX`), StatusLabel (six types), CustomField, FieldSet.
- **Other features not rebuilt here:** Excel bulk upload for assets and accessories, PDF handover form with tenant header/footer images, invoice file upload to cloud storage (5 MB limit), field-level encryption of asset data per tenant (`Tenant context is required for asset encryption`), per-company asset-tag patterns.

## 2. Frontend compatibility

- **Confirmed:** the route guard is a single `PermissionGuard permissions={['assest.type.view1']}` in `layout.tsx`. The key contains a typo (`assest`, trailing `1`), so it should be treated as a placeholder and replaced.
- The module imports shared pieces via `@/core/...` (`ui/*`, `lib/toast`, `utils/logger`, `types/user/*`). Current shared components may have moved or changed API.
- Large components (for example `AssetClient.tsx`, `AssetTableView.tsx`, `AssetModal.tsx`) mix data fetching, table state and presentation. **Assumption:** they will need splitting when migrated to the current layout.
- The prototype's `ItemFormDrawer`, `ActionDrawers`, `DataTable` and `settingsConfig` show one way to reduce that duplication (one generic list, detail and settings page for the four kinds).

## 3. Legacy UI modernisation

- The legacy UI uses table-heavy modals. The prototype replaces them with right-hand drawers for create, edit, assign, return and status change, and with tabs on the detail page, matching the Onboarding and Offboarding direction.
- Dashboard widgets (pie and area charts) were replaced with lightweight CSS bars. A charting library is not needed for the prototype; production may keep the existing charts.

## 4. Permission architecture

- **Confirmed:** only the module-level guard above was found on the page layout. **Assumption:** backend routes enforce their own permission checks. This was not traced route by route and should be verified in `routes/*.ts`.
- **Not done in the prototype:** all actions are available to the demo user.
- **To do:** map to current permission keys and the RBAC guide (`Accxis360.Api/RBAC_DEVELOPER_GUIDE.md`). Likely split: view, create/edit, assign/return, status/maintenance, delete, and settings management.

## 5. Organisation structure

- **Confirmed:** assets are scoped by `company` and `department` (both required for assets). "Users" are verified application users.
- **Assumption:** the newer organisation structure (see the Organization Structure documents in the workspace) introduces a richer hierarchy than company/department. Asset ownership, asset-type scoping (`AssetType.company`) and department validation will need re-mapping.
- The prototype keeps company and department only, with a dummy employee list.

## 6. Backend and API compatibility

- Endpoint families seen in `routes/`: assets (including individual-asset operations, status, invoice, availability, expiring, stats), licenses, accessories, components, maintenance, assigned-user views, dashboard (available items, expiring items, new items by month, totals), and settings (company, department, category, manufacturer, supplier, model, asset type, status label, custom field, fieldset, serial number).
- The prototype's `services/domain.ts` mirrors the rules in `asset.service.ts` (availability, restricted statuses, maintenance transitions, delete guards, tag pattern validation). Re-use it as an executable specification when testing the real API.
- **Assumption:** response shapes populate references (`assignedToUser`, `assetModel`, `company`) inline. The prototype uses plain ids.

## 7. Data model compatibility

- Assignments are embedded in the parent record (`currentAssignments`, `assignmentHistory`). The prototype uses one flat `assignments` collection plus `unit.assignmentId` for simpler querying. Either is workable; the flat form scales better for "my assignments" and per-user views.
- Individual records of Components and Accessories use a string `status` (`available | assigned | maintenance | retired`), whereas Assets use status labels with types. Licenses add `activated | expired`. This inconsistency is kept in the prototype because it is how the source behaves.
- Maintenance is modelled only on assets. Components and accessories can reach a `maintenance` state but have no maintenance records. **Assumption:** this is a gap rather than a decision.
- Return `condition` (Good, Damaged, Lost) is a **prototype addition** for the demo. It is not stored by the legacy API, which has `returnNotes` only.
- The legacy `Asset.eolDate` is now per individual asset (the code comments say so); older data may still carry the parent-level field.

## 8. Shared component compatibility

- Replace prototype primitives (`components/ui`) with the current shared design system. Names and props deliberately follow common patterns (Button, Badge, Drawer, Dialog, Pagination, Menu).
- `SearchableSelect` replaces several bespoke dropdowns in the legacy module.

## 9. Integration risks

1. Permission key and typo above: the module may be inaccessible or open to everyone until fixed.
2. Per-tenant encryption of asset fields requires tenant context on every request. Frontend list/search and CSV export assume decrypted values.
3. Tag uniqueness is checked across assets, licenses and others in the prototype. In the backend, `findTagsByPattern` is run against assets only. Confirm the intended scope.
4. Bulk upload and handover PDF depend on tenant resources (header/footer images) and were not reproduced.
5. Invoice upload uses cloud storage configuration. Not simulated beyond capturing a file name.
6. The `assignedToAsset` / `individualAssetId` pair has legacy fallbacks (assigning to a parent asset only). The prototype always requires the individual asset.

## 10. Recommended refactoring

1. Introduce a single `InventoryItem` abstraction on the frontend for the four kinds, as in the prototype.
2. Normalise individual-record status (labels for all kinds, or a shared enum).
3. Split the large table and modal components, and move data fetching to hooks.
4. Align the dashboard endpoints with the new organisation structure.
5. Add automated tests for the rules in section 6 before moving them, using `services/domain.ts` as a reference.

## Simplifications made in this prototype

- No authentication, permissions or tenant context.
- No bulk upload, Excel import, or real file uploads. Invoice and PDF export are represented by a file name and a print-to-PDF handover form.
- Employees are a fixed dummy list. "Users" in the original come from the HR/user module.
- Data is stored in `localStorage` and latency is simulated (about 350 ms).
- Settings pages share one generic create/edit/delete implementation.
