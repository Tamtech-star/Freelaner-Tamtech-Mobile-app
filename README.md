# Freelancer-Tamtech Mobile App

Freelancer-Tamtech is an Expo/React Native mobile client for Tamtech Tools Ltd. It provides role-based access for sales agents, administrators, and freelancers, together with offline sales-record capture, editable sales history, local caching of selected portal data, and an interactive Virtual Showroom for freelancer product education.

This README describes the mobile project in `freelancer-tamtech/`. It does not document the backend API implementation, the web portal, or the ignored `spirospares.referance/` copy.

`freelancer-tamtech/spirospares.referance/` is the local authoritative reference copy of the separately deployed Spiro Spares website/backend. Changes made there are not deployed with the Expo app: copy each changed backend file to the real backend and run any accompanying Supabase migration explicitly.

## Current Feature Highlights

- Role-based mobile experiences for sales agents, administrators, freelancers, and public users.
- Offline-first sales recording with durable document files, SQLite outbox persistence, retry, and synchronization.
- Searchable, date-filtered sales history with CSV export and document viewing.
- Existing-sale editing with a prefilled form, remote document retention, optional replacement uploads, and backend matching reconciliation.
- Freelancer Virtual Showroom with an interactive EKON450 M1V3 studio, colour galleries, feature hotspots, sound effects, and ambient audio.
- Guided purchase education covering hire purchase and cash purchase, animated guides, and narrated explanations.
- Backend-owned forward and retroactive customer-ID matching, freelancer commission invoices, admin notifications, and pending-payment review.

## Responsibilities

The mobile app is responsible for:

- Authenticating users through the mobile login endpoint.
- Selecting the mobile experience from the authenticated user role.
- Capturing sales records and document attachments.
- Prefilling and editing previously synchronized sales records.
- Persisting pending sales locally when a submission cannot be sent immediately.
- Uploading queued submissions when connectivity is available.
- Caching sales history, freelancers, and other mobile data used by the screens.
- Displaying the authoritative data returned by the backend after synchronization.
- Presenting the code-driven Virtual Showroom and purchase guides with bundled image and audio assets.

The backend remains responsible for:

- Authentication and token validity.
- Generating permanent conversion codes such as `CNV-######`.
- Matching a submitted customer ID against an open freelancer lead.
- Deciding whether a record is a direct sale or freelancer conversion.
- Storing uploaded documents and returning their server URLs.
- Commission calculation, approval, payment, and payment status.
- Re-running lead/referral matching when an existing sale is edited.

The mobile app must not treat a local placeholder or a local payment status as the final business decision.

## Technology Stack

- Expo SDK `54.0.37`
- Expo Router `~6.0.24`
- React Native `0.81.5`
- React `19.1.0`
- TypeScript `~5.9.2`
- SQLite through `expo-sqlite`
- Secure credentials through `expo-secure-store`
- HTTP requests through Axios
- Network monitoring through `@react-native-community/netinfo`
- Zustand for in-memory authentication state
- NativeWind and React Native styles for UI styling

The app uses the React Native new architecture and Expo Router's file-based routing.

## Project Layout

```text
freelancer-tamtech/
├── app/                         Expo Router screens and route groups
│   ├── _layout.tsx              Session restoration and role-based navigation
│   ├── index.tsx                Initial route entry
│   ├── login.tsx                Login screen
│   ├── (admin)/                 Admin screens
│   ├── (freelancer)/            Freelancer screens
│   │   └── showroom/             Virtual Showroom hub, bike studio, and purchase guide
│   ├── (public)/                Public registration/referral screens
│   └── (sales-record)/          Sales-agent screens and sales form
├── src/
│   ├── api/                     Axios client and API-specific modules
│   ├── constants/               API URL, storage keys, colors, domain constants
│   ├── offline/                 SQLite schema, cache, outbox, and sync worker
│   ├── store/                   Zustand authentication store
│   ├── types/                   Shared mobile TypeScript types
│   └── utils/                   Compression, CSV, filtering, display, and network helpers
├── assets/                      App icons, splash assets, and other bundled assets
│   ├── images/bikes/             Showroom bike and colour-gallery images
│   └── sounds/                   Showroom ambience, hotspot effects, and narration
├── tests/                       Focused unit tests for mobile utilities and sync policy
├── app.json                     Expo application configuration
├── eas.json                     EAS preview/production build profiles
├── package.json                 Dependencies and Expo commands
├── package-lock.json            Locked dependency tree
├── tsconfig.json                Mobile TypeScript project configuration
└── .env.example                 Environment variable template
```

The `spirospares.referance/` directory is a separate ignored reference tree. It is not a mobile source directory and is excluded from the mobile TypeScript project.

## Prerequisites

Install the following before working on the project:

- Node.js compatible with the installed Expo SDK.
- npm.
- Expo Go on a physical device, or an Android/iOS emulator.
- Access to the configured backend API.

For native builds or EAS builds, install and authenticate with the EAS CLI as required by the team's release process.

## Installation

From the mobile project directory:

```bash
cd freelancer-tamtech
npm install
```

Create a local `.env` from `.env.example` when environment configuration is needed:

```bash
cp .env.example .env
```

Do not commit `.env` files, access tokens, Supabase keys, or other credentials.

### Environment Variables

`EXPO_PUBLIC_API_URL` is documented in `.env.example`, but the current checked-in mobile implementation uses the production API URL hardcoded in `src/constants/config.ts`. Changing environments therefore requires an intentional code/configuration change; setting `.env` alone does not currently override `API_BASE_URL`.

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are optional variables for code paths that need direct Supabase-related access. They are not used by the Axios client for ordinary API calls.

Expo public variables are bundled into the application. They must never contain private secrets. Authentication tokens are stored separately using SecureStore.

## Running the App

Start Metro:

```bash
npm start
```

Start with a specific platform:

```bash
npm run android
npm run ios
npm run web
```

For Expo Go:

1. Start Metro with `npm start`.
2. Keep the phone and development computer on the same network.
3. Scan the QR code using Expo Go.
4. If port `8081` is already occupied, start on another port, for example:

```bash
npx expo start --lan --clear --port 8082
```

The `--clear` option clears Metro's cache and is useful after dependency or routing changes.

## Navigation and Roles

`app/_layout.tsx` restores the SecureStore session and initializes the offline database. Once the session check finishes, the authenticated role controls the available route group:

| Role | Route group | Main purpose |
| --- | --- | --- |
| `sales_agent` | `(sales-record)` | Capture sales and view sales history |
| `admin` | `(admin)` | Review and manage portal data |
| `freelancer` | `(freelancer)` | View the freelancer experience |
| Unauthenticated | `login` | Authenticate with the backend |
| Public | `(public)` | Registration and referral flows |

The role is returned by `/auth/mobile-login` and persisted in SecureStore with the token and user data.

Freelancers can open the Virtual Showroom from their experience. Sales agents can open synchronized sales-history records, inspect their documents, and launch the same sales form in edit mode.

## Authentication

The authentication flow is implemented across:

- `src/api/auth.ts`: login, logout, and session restoration.
- `src/api/client.ts`: Axios instance and token interceptor.
- `src/store/authStore.ts`: in-memory Zustand state used by screens.
- `app/_layout.tsx`: startup session restoration and route selection.

Login posts credentials to `/auth/mobile-login`. The response token is stored under `auth_token`. Subsequent non-auth requests receive the token as a Bearer token through the Axios request interceptor.

For a non-authenticated `401` response, the client clears the stored token, role, and user data. Login and registration `401` responses are not treated as an expired session.

The Zustand store uses `token: "active"` after login as an in-memory authenticated marker. The actual token is intentionally kept in SecureStore and is read by the Axios interceptor when requests are made.

## API Layer

API modules live under `src/api/` and should contain request/response types close to the endpoint they represent. The shared Axios instance is `src/api/client.ts`.

Important modules include:

- `auth.ts`: mobile login, logout, session data, and public freelancer registration.
- `salesRecord.ts`: sales-record types, history requests, and multipart submission.
- `salesHistory.ts`: local-first history reads and explicit history synchronization.
- `admin.ts`: administrator data requests and local cache integration.
- `portal.ts`: portal-related API operations.
- `referrals.ts`: referral-related operations.

When adding an endpoint:

1. Add a typed API function in the relevant module.
2. Reuse the shared Axios instance.
3. Keep authentication concerns in `client.ts` rather than duplicating token logic.
4. Decide explicitly whether the screen needs remote-only, local-first, or cached-resource behavior.
5. Add focused tests for transformation and error behavior where practical.

## Offline Architecture

Offline behavior has three layers:

1. SQLite persistence.
2. A pending sales outbox.
3. A network-aware synchronization worker.

### SQLite Database

`src/offline/database.ts` opens `tamtech-offline.db` and initializes the following tables:

- `app_metadata`: synchronization cursors such as `last_pull_at`.
- `cached_resources`: generic JSON cache entries.
- `freelancers`: locally cached freelancer rows.
- `materials`: locally cached material rows.
- `sales_records`: sales history plus pending local submissions.

The database uses WAL mode and creates indexes for synchronization and update timestamps.

### Local-First Reads

Local-first functions return SQLite data immediately and trigger a stale synchronization in the background. This keeps screens usable when the network is slow or unavailable.

For sales history, the normal pattern is:

```ts
const rows = await getSalesHistoryLocalFirst()
```

The function reads local records first. It then calls `runSyncWorkerIfStale()` without blocking the initial screen result.

Use `syncSalesHistoryNow()` for an explicit user refresh. It waits for synchronization and then reads the updated local records.

### Freshness Policy

`src/offline/syncPolicy.ts` defines:

```text
AUTO_SYNC_MAX_AGE_MS = 15 minutes
```

Automatic remote pulls run when there is no valid cursor or when the last pull is at least 15 minutes old. A manual refresh can run immediately.

### Synchronization Worker

`src/offline/syncWorker.ts` starts when the root layout has initialized SQLite. It also listens to network changes.

The worker:

1. Checks whether the device is connected and internet reachability is not explicitly false.
2. Pushes pending sales records first.
3. Pulls freelancer rows and sales history in parallel.
4. Upserts successful responses into SQLite.
5. Updates `last_pull_at`.
6. Notifies subscribed screens so they can reload local data.

Only one synchronization run is allowed at a time through the `activeSync` promise. Failed pending submissions remain in SQLite and are retried during a later synchronization event.

## Sales Record Workflow

The sales-record screens are in `app/(sales-record)/`:

- `index.tsx`: sales-record landing screen, recent rows, history, filtering, and CSV download.
- `form.tsx`: sales form, validation, image selection, image compression, local persistence, and upload queueing.

### Submission Flow

The form supports direct sales and freelancer-lead sales. It collects customer details, bike/sale details, invoice details, and document attachments.

When files are selected:

1. The image is compressed using `compressImageForUpload`.
2. A durable copy is placed in the app document directory under `sales-outbox`.
3. The durable file URI is saved in the pending payload.

When the form is submitted:

1. A local ID is created.
2. `buildPendingSalesRecord` creates a SQLite row with `sync_status: "pending"`.
3. The local display code is generated as `LOCAL-*`.
4. The complete multipart payload is saved as `payload_json`.
5. The row is inserted into SQLite.
6. The sync worker is triggered without blocking the form reset.

When connectivity is available, the worker reconstructs `FormData` from `payload_json` and posts it to `/sales-record`. The row is removed from the pending outbox only after the server returns a conversion code.

### Local and Server Conversion Codes

`LOCAL-*` is a temporary device-side placeholder. It exists so the pending row can be displayed before the backend has accepted it.

The permanent conversion code is generated by the backend. After the upload succeeds, the next history pull upserts the server row into SQLite. The screen should then display the server's `CNV-*` code and server document URLs.

Do not implement client-side replacement logic that guesses or generates permanent `CNV-*` values.

### Documents

The local pending row stores durable local file URIs so an offline submission can still be uploaded later. These URIs are not server URLs and are not permanent links.

After successful synchronization, the backend-provided document URLs are the authoritative values shown in history/detail views.

### Editing an Existing Sale

Sales history supports editing records that have already synchronized with the backend:

1. The history/detail view uses the authoritative `sale_conversions.id` as `editId`.
2. The form is prefilled from the complete cached history row so it remains useful while the detail request is loading.
3. `GET /sales-record/:id` enriches the form with the latest server values when the backend route is deployed.
4. Existing remote document URLs are displayed separately from newly selected local replacement files.
5. Unchanged remote documents are retained; only newly selected files are uploaded as replacements.
6. Saving sends multipart `PATCH /sales-record/:id` and identifies the editor.
7. The backend updates the conversion and re-runs matching when the customer ID changes, preserving the distinction between freelancer leads and public referrals.

The edit route depends on the separately deployed backend implementation and its sales-history schema migrations. If that backend route has not been transferred yet, the mobile form retains its history-based prefill and reports the deployment dependency instead of clearing the form.

### Payment and Approval Status

The mobile outbox uses `payment_status: "pending"` for a new local row. This only describes the local initial state. Payment approval and commission processing are server-owned workflows.

The following statuses should not be conflated:

- `sync_status`: whether the local device has sent and confirmed the record.
- `payment_status`: the backend's payment or commission state.
- `submission_type`: whether the backend classified the record as a direct sale or freelancer-lead submission.

Successful upload does not itself mean commission has been approved or paid.

### Conversion Matching and Pending Payments

Customer-ID matching is backend-owned and supports both event orders:

| First event | Second event | Result |
| --- | --- | --- |
| Freelancer lead | Sale record | Sale links to the lead, the lead converts, and a freelancer commission invoice is created. |
| Direct sale | Freelancer lead | The retroactive matcher claims the direct sale, links the new lead, converts it, and creates the same commission invoice. |
| Public referral | Sale record, in either order | Referral converts without a freelancer invoice and remains in the separate manual referral-payout workflow. |

Freelancer commission invoices are calculated from quantity and the configured per-unit rate (default `KES 2,000`) and enter the admin queue with `invoice_status: pending_admin`. The deployed Supabase schema must include `pending_admin` in the `commission_invoices.invoice_status` constraint. The mobile app displays the server result but does not calculate, approve, or pay commissions itself.

## Virtual Showroom

The Virtual Showroom is a lightweight, code-driven React Native experience under `app/(freelancer)/showroom/`. It uses local images, Expo AV, gradients, and Reanimated rather than bundled MP4 video.

### Showroom Hub

`showroom/index.tsx` presents two experiences:

- **Know Your Bike** — interactive product studio.
- **How to Purchase** — ownership and financing education.

The hub plays looping ambient audio while focused, pauses it when opening a child experience, resumes it when returning, and stops/unloads it when leaving the showroom.

### Know Your Bike

`showroom/know-your-bike.tsx` and `src/data/bikeModels.ts` currently present the EKON450 M1V3 with:

- Available colour selection and local image galleries.
- Animated presentation and pulsing tap targets.
- Hotspots for motor, front suspension/braking, rear setup, dashboard, and comfort/storage.
- Ambient studio audio and separate hotspot effects.
- Safe pause, resume, stop, and unload handling across modal and route navigation.

Bike specifications, prices, available colours, image imports, hotspot positions, and descriptions are defined in `src/data/bikeModels.ts`. Confirm the required local assets exist before adding or enabling a model/colour.

### How to Purchase

`showroom/financing.tsx` provides expandable purchase cards for:

- Hire purchase through Watu Financing.
- Cash purchase and immediate ownership.

Each option includes key costs/requirements plus an animated guide with option-specific narration. Purchase figures are presentation content and should be reviewed when commercial terms change.

## Caching Other Data

The admin and other data modules use the same local-first principle where implemented:

- Read the local SQLite/cache value for immediate rendering.
- Start a stale background sync.
- Refresh the screen through `subscribeToOfflineData` when synchronization changes local data.

When modifying a cache-backed screen, preserve the distinction between:

- data currently available on the device;
- data successfully returned by the server;
- data still waiting in the local outbox.

## Image Uploads

Image handling is implemented in `src/utils/imageCompression.ts` and its policy module. The form uses Expo Image Picker for camera/gallery selection, then compresses files before placing them in the durable local outbox.

When changing upload behavior, verify:

- Camera and gallery permissions.
- Durable file copying before the form state is cleared.
- Multipart field names expected by the backend.
- Retry behavior after the app is closed or connectivity is lost.
- Whether a file URI is local or server-owned.

## CSV and Filtering Utilities

The sales and freelancer screens use focused utility modules:

- `src/utils/salesCsv.ts`: sales CSV formatting.
- `src/utils/salesCsvDownload.ts`: platform file/share behavior.
- `src/utils/freelancerCsv.ts`: freelancer CSV formatting.
- `src/utils/freelancerCsvDownload.ts`: freelancer CSV download behavior.
- `src/utils/salesDateFilter.ts`: date filtering rules.
- `src/utils/salesDisplay.ts`: display names and status presentation.

Keep formatting and filtering logic outside screen components so it can be tested without starting Expo.

## TypeScript Configuration

The mobile `tsconfig.json` explicitly sets `jsx: "react-native"` and includes only:

- `App.tsx`
- `index.ts`
- `app/**/*.ts`
- `app/**/*.tsx`
- `src/**/*.ts`
- `src/**/*.tsx`

It excludes `tests`, `node_modules`, and `spirospares.referance`. This boundary is important because `.gitignore` controls Git tracking only; it does not control which files TypeScript or VS Code scans.

If VS Code reports `Cannot use JSX unless the '--jsx' flag is provided` across many TSX lines:

1. Confirm VS Code opened the `freelancer-tamtech` directory as the workspace root.
2. Run `npx tsc --showConfig` and confirm `jsx` is `react-native`.
3. Run `npx tsc --listFilesOnly` and confirm the reference tree is absent.
4. Use **TypeScript: Restart TS Server** from the VS Code command palette.
5. Reload the window if the old inferred project remains.

Those messages are commonly a project-context failure multiplied across JSX elements, not hundreds of independent source errors.

## Verification Commands

Run these from `freelancer-tamtech/`:

```bash
# Check the resolved TypeScript configuration
npx tsc --showConfig

# Confirm the mobile project files
npx tsc --listFilesOnly

# Typecheck the mobile application
npx tsc --noEmit --pretty false

# Validate Expo dependencies and configuration
npx expo-doctor

# Bundle the Android application without producing a native build
npx expo export --platform android --output-dir .expo-export-check
```

The repository currently has no `test` script in `package.json`. Test files are under `tests/` and should be run using the test runner configured by the development environment or by adding an explicit project test script before relying on a command in automation.

Do not treat a successful Metro bundle as proof that the backend accepted a multipart upload or that commission was approved. Those require an API-level verification.

## EAS Builds and Updates

`eas.json` defines:

- `preview`: Android APK on the `preview` channel.
- `production`: Android App Bundle on the `production` channel.
- Production submission to the Android internal track as a draft.

The Expo project ID, update URL, Android package name, runtime version policy, and native plugins are in `app.json`.

Typical commands, subject to the team's EAS authentication and release policy:

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
```

Do not change the Android package name, Expo project ID, update URL, or runtime version policy casually. These values affect installed-app identity and OTA update compatibility.

## Adding a Screen

1. Place the screen in the correct `app/` route group.
2. Put network calls in `src/api/`, not directly in the component, when the operation is reusable.
3. Add or reuse a typed domain model.
4. Decide whether the screen is remote-only, local-first, or cache-backed.
5. Subscribe to offline data changes if the screen displays synchronized SQLite data.
6. Keep role access aligned with `app/_layout.tsx`.
7. Add focused utility tests for non-UI behavior.
8. Run TypeScript, Expo Doctor, and an Expo bundle check.

## Troubleshooting

### Expo Go says packages should be updated

Use the Expo installer so versions are resolved for the installed SDK:

```bash
npx expo install
npx expo-doctor
```

Restart Metro with a cleared cache after dependency changes:

```bash
npx expo start --clear
```

### Port 8081 is already in use

Start Metro on another port:

```bash
npx expo start --lan --clear --port 8082
```

Use the QR code generated by that Metro process.

### Sales appear as `LOCAL-*`

That means the row is still represented by the local outbox/cache or the device has not yet pulled the server version. Check connectivity, inspect the sync state, trigger a manual history refresh, and verify the backend response. Do not manually change the local code to a guessed server code.

### A sale is uploaded but remains payment-pending

Upload synchronization and payment approval are separate. Confirm that the record exists on the backend, then use the backend's configured review/approval workflow. The mobile sync worker does not approve commission payments.

If a converted freelancer sale is missing from Pending Payments, verify that the deployed database accepts `pending_admin`, that a `commission_invoices` row exists, and that the review endpoint is filtering that same status. For a sale-first/lead-later match, also confirm the retroactive matcher linked the conversion to the new lead.

### Editing a sale shows a backend deployment message

The cached sales-history row is still used to prefill the form. Transfer and deploy the backend `GET/PATCH /sales-record/:id` route and its required Supabase migration, then refresh sales history. Do not replace the conversion ID with a lead ID in the edit URL.

### Showroom audio continues or fails to resume

Showroom routes intentionally pause audio while navigating between experiences and stop/unload it when leaving or unmounting. Keep that lifecycle when modifying routes. Audio failures should not block visual interaction; confirm the referenced files under `assets/sounds/` exist and are valid audio files.

### A pending submission does not upload

Check:

- Device connectivity and internet reachability.
- The API base URL.
- Authentication expiry.
- Whether the durable files still exist under the app document directory.
- The pending SQLite row and its `payload_json`.
- Backend response status and multipart field names.

Failed rows intentionally remain pending for a later retry.

### TypeScript reports hundreds of JSX errors

This usually means VS Code has loaded an inferred TypeScript project rather than the Expo project. Open the `freelancer-tamtech` directory, verify `tsconfig.json`, restart the TypeScript server, and ensure the ignored reference tree is not being included.

## Change Boundaries

Changes to this mobile project affect the Expo client only. They do not automatically change:

- Backend matching or conversion-code generation.
- Server document storage.
- Admin approval logic.
- Payment or commission workflows.
- The ignored reference project.

When a change depends on a backend contract, document the endpoint and expected response shape in the mobile API module and verify the deployed backend separately.

For backend-reference work, finish with an exact transfer list and list SQL migrations separately. Copying a migration file is not sufficient—the SQL must also be executed against the deployed Supabase database.
