# Sales Dashboard CSV Export and Card Update Implementation Plan

> **For Hermes:** Implement only after the user explicitly approves proceeding.

**Goal:** Add working CSV downloads to the relevant admin sales views, then update sales cards, history rows, and opened sale details to show the freelancer and payment type (`Cash` or `Loan`) instead of commission and paid status.

**Architecture:** Reuse the sales data already loaded by each dashboard section and introduce a shared CSV export utility where practical. Keep the work in two phases so export behavior can be completed and verified before changing the sales card presentation.

**Tech Stack:** Existing application stack and its current sales dashboard components/services; no new dependency unless repository inspection proves one is necessary.

---

## Interpreted Requirements

### Phase 1 — CSV downloads

1. **Admin → Sales Dashboard summary section**
   - Add a **Download CSV** button at the top of the section containing:
     - Total Sales
     - Direct Sales
     - Freelancer Lead Sales
   - The downloaded CSV should contain the underlying sales details represented by that section, not merely the three displayed totals.

2. **Sales Dashboard → Sales History**
   - Add a working **Download CSV** button to the Sales History area.
   - The export should download the sales-history records that the user is viewing.
   - CSV values and headers should be readable, consistently formatted, and safely escaped.

### Phase 2 — Sales card, history, and detail fields

3. Update each sales record/card in both the Admin Sales Dashboard and Sales History so it displays:
   - Customer Name
   - Invoice Date
   - Freelancer Name
   - Payment Type/Mode (`Cash` or `Loan`)

4. Replace the existing **Commission** field/column with **Freelancer Name**.

5. Replace the existing **Paid** field/status with **Payment Type** or **Payment Mode**, using the sale's actual `Cash` or `Loan` value.

6. When a user clicks a sales card/row to open its full details:
   - Remove Commission.
   - Remove the old Paid field/status.
   - Show Payment Type/Mode as `Cash` or `Loan`.
   - Keep the other relevant sale details unchanged.

7. Apply these presentation changes consistently across:
   - Admin Sales Dashboard sales records.
   - Sales History records.
   - The full sale details view/modal opened from either section.

8. Preserve the rest of the sales behavior and data handling unless a related change is required for these fields.

---

## Proposed Implementation Steps

### Task 1: Inspect the existing sales dashboard flow

- Locate the admin sales dashboard, summary cards, sales history component, sales card/table, sales API/service, and existing tests.
- Trace how total, direct, and freelancer-lead sales are fetched and filtered.
- Confirm the actual field that contains the freelancer's display name and determine the desired fallback when a sale has no freelancer.
- Check whether the repository already has a CSV export helper or button pattern that should be reused.

### Task 2: Define export columns and data scope

- Map internal sale fields to clear CSV headers.
- Include the relevant record details available to the dashboard, such as customer, invoice date, sale type/source, freelancer, amount, and identifiers where appropriate.
- Make the summary-section export cover the records behind Total Sales, Direct Sales, and Freelancer Lead Sales.
- Make the Sales History export respect the currently active history filters/search/date range, if those controls exist.
- Use a stable filename containing the report name and export date.

### Task 3: Implement a reusable CSV exporter

- Build or reuse one utility that:
  - Converts sales records into CSV rows.
  - Escapes commas, quotes, and line breaks correctly.
  - Handles missing/null values.
  - Produces a browser-downloadable CSV file.
  - Prevents spreadsheet formula injection for dangerous cell prefixes where applicable.
- Add focused tests for formatting and edge cases.

### Task 4: Add the summary-section Download CSV button

- Place the button at the top of the Total Sales / Direct Sales / Freelancer Lead Sales section.
- Connect it to the correct underlying combined sales dataset.
- Disable it or give appropriate feedback when no data is available.
- Verify the downloaded file opens correctly and totals/categories correspond to the dashboard data.

### Task 5: Add the Sales History Download CSV button

- Place a clearly visible button in the Sales History header/actions area.
- Export the appropriate history rows using the shared CSV utility.
- Verify filtered results are exported correctly if filtering exists.
- Verify empty, single-row, and multi-row exports.

### Task 6: Update sales cards, history rows, and full details

- Replace **Commission** with **Freelancer Name** on the visible sales cards/rows.
- Replace **Paid** with **Payment Type/Mode** on the visible sales cards/rows.
- Display the actual normalized value as `Cash` or `Loan` rather than a paid/unpaid status.
- Keep Customer Name and Invoice Date.
- Add a sensible display fallback for direct sales or records without an assigned freelancer, subject to confirmation during implementation (for example, `Direct Sale` or `—`).
- Update the full details view opened after clicking a sales card/row: remove Commission and Paid, and add Payment Type/Mode (`Cash` or `Loan`).
- Apply the same field rules in both the Admin Sales Dashboard and Sales History.
- Update component tests/snapshots to match the new fields.

### Task 7: End-to-end validation

- Run the relevant unit/component tests, type checking, linting, and application build.
- Manually verify both download buttons in the running app.
- Open each generated CSV and compare representative rows with the visible dashboard/history data.
- Confirm sales cards/rows in both Admin Sales Dashboard and Sales History display Customer Name, Invoice Date, Freelancer Name, and Payment Type/Mode (`Cash` or `Loan`).
- Click records in both sections and confirm the full details remove Commission and Paid while showing Payment Type/Mode.
- Confirm unrelated admin dashboard behavior is unchanged.

---

## Files Likely to Change

Exact paths will be identified through repository inspection after approval. Expected areas are:

- Admin sales dashboard screen/component
- Sales summary section/component
- Sales history component
- Sales card or sales table-row component
- Sales data mapping/service or selector
- Shared CSV export utility
- Relevant unit/component tests

## Acceptance Criteria

- A visible Download CSV button exists above the admin sales summary section.
- Its CSV includes detailed sales records across total/direct/freelancer-lead sales.
- A visible and working Download CSV button exists in Sales History.
- Exported files contain valid headers and correctly escaped values.
- Sales History exports match the active data scope/filters where applicable.
- Sales cards/rows in both Admin Sales Dashboard and Sales History show Customer Name, Invoice Date, Freelancer Name, and Payment Type/Mode.
- Payment Type/Mode displays the sale's actual `Cash` or `Loan` value.
- Commission is no longer displayed on cards/rows or in the opened full details.
- Paid is no longer displayed; it is replaced by Payment Type/Mode on cards/rows and in the opened full details.
- Tests, lint/type checks, and build pass.

## Implementation Decisions to Confirm from the Codebase

- Whether the top summary export should be one combined CSV with a `Sale Type` column or another representation.
- Whether Sales History should export only the current page or all records matching the current filters; the recommended default is all matching filtered records.
- What label to show when a direct sale has no freelancer; the recommended default is `Direct Sale`.
