PHASED IMPLEMENTATION PLAN
Phase 0 — Project Scaffolding (1 day)
Goal: Get a working Expo project that builds, runs on a device, and can connect to your backend.

Tasks:

Initialize the Expo project

Run
npx create-expo-app@latest freelancer-tamtech --template blank-typescript
cd freelancer-tamtech
Install core dependencies

Run
npx expo install expo-router expo-secure-store expo-image-picker expo-status-bar
npx expo install react-native-safe-area-context react-native-screens
npx expo install react-native-gesture-handler react-native-reanimated
npm install axios
Set up Expo Router file structure


Apply
app/
  _layout.tsx          # Root layout with auth gate
  index.tsx            # Default → redirect to login
  login.tsx            # Login screen
  (sales-record)/      # Sales agent group
    _layout.tsx
    index.tsx          # Sales Record Home
    form.tsx           # Sales Record Form
    preview.tsx        # Preview & Confirm
  (freelancer)/        # Freelancer group
    _layout.tsx
    index.tsx          # Freelancer Dashboard
  (public)/            # Public referral
    _layout.tsx
    referral.tsx       # Referral lead form
Create src/ support structure


Apply
src/
  api/
    client.ts          # Axios instance with base URL + interceptors
    auth.ts            # login(), logout(), refreshToken()
    sales.ts           # directSale(), getConvertedSales()
    leads.ts           # submitLead(), getFreelancerStats()
    referrals.ts       # submitReferral()
  store/
    authStore.ts       # Zustand or React Context for auth state
  components/
    FormField.tsx      # Reusable input with validation styling
    DocumentUpload.tsx # Camera/gallery picker wrapper
    LoadingOverlay.tsx
    ErrorBanner.tsx
  constants/
    config.ts          # API_BASE_URL, SUPABASE_URL, etc.
    roles.ts           # Role constants
  types/
    index.ts           # All TypeScript interfaces
Deliverable: App runs on a device via Expo Go, shows a login screen, and can make a test GET /api/health call to your backend.

Phase 1 — Authentication & Role Routing (1.5 days)
Goal: Users can log in, get routed to the correct screen based on role, and the JWT is stored securely.

Tasks:

Build src/api/client.ts


Apply
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const api = axios.create({
  baseURL: 'https://your-backend.onrender.com/api',
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token')
      // Redirect to login — handled by auth store listener
    }
    return Promise.reject(error)
  }
)

export default api
Build src/api/auth.ts


Apply
import api from './client'
import * as SecureStore from 'expo-secure-store'

export async function mobileLogin(email: string, password: string) {
  const response = await api.post('/auth/mobile-login', { email, password })
  const { token, role, user } = response.data

  await SecureStore.setItemAsync('auth_token', token)
  await SecureStore.setItemAsync('user_role', role)
  await SecureStore.setItemAsync('user_data', JSON.stringify(user))

  return { role, user }
}

export async function logout() {
  await SecureStore.deleteItemAsync('auth_token')
  await SecureStore.deleteItemAsync('user_role')
  await SecureStore.deleteItemAsync('user_data')
}

export async function getStoredAuth() {
  const token = await SecureStore.getItemAsync('auth_token')
  const role = await SecureStore.getItemAsync('user_role')
  const userData = await SecureStore.getItemAsync('user_data')
  
  if (!token || !role) return null
  return { token, role, user: userData ? JSON.parse(userData) : null }
}
Build the Login Screen (app/login.tsx)

Email + password inputs
On submit → call mobileLogin()
On success → redirect via router.replace() based on role:
sales_agent → /sales-record
freelancer → /freelancer-portal
On error → show inline error message
"Submit Referral Without Login" link → /referral
Build Root Layout with Auth Gate (app/_layout.tsx)

On app launch, call getStoredAuth()
If valid token exists → redirect to role-based screen
If no token → show login
Listen for 401 responses to force logout
Build Sales Agent Layout (app/(sales-record)/_layout.tsx)

Stack navigator with screens: index, form, preview
Check role === 'sales_agent' or redirect away
Build Freelancer Layout (app/(freelancer)/_layout.tsx)

Stack navigator with screens: index
Check role === 'freelancer' or redirect away
Deliverable: Full login flow works end-to-end. Sales agents land on sales home, freelancers land on dashboard. Logout clears everything.

Phase 2 — Sales Record Home & History (1 day)
Goal: Sales agents see their dashboard with action buttons and read-only conversion history.

Tasks:

Build src/api/sales.ts


Apply
import api from './client'

export interface SaleConversion {
  id: string
  customer_name: string
  customer_type: 'individual' | 'company'
  bike_model: string
  submission_type: 'direct_sale' | 'freelancer_lead'
  status: string
  created_at: string
  // ... other fields
}

export async function getConvertedSales(): Promise<SaleConversion[]> {
  const response = await api.get('/admin/converted-sales')
  return response.data.sales
}
Build Sales Record Home (app/(sales-record)/index.tsx)

Header: "Sales Record Portal"
Two primary action cards:
"Record Direct Sale" → navigates to /sales-record/form
"Convert Freelancer Lead" → navigates to form with a flag
Sales History section: FlatList of past conversions
Each item shows: customer name, bike model, date, status badge
Pull-to-refresh
Loading skeleton while fetching
Logout button in header
Fetch and display history

useEffect on mount → getConvertedSales()
Show empty state: "No sales recorded yet"
Format dates with toLocaleDateString()
Deliverable: Sales agent can see their dashboard and browse past sales history.

Phase 3 — Sales Record Form (1.5 days)
Goal: The comprehensive one-step form for recording sales with conditional logic and document uploads.

Tasks:

Build src/components/FormField.tsx


Apply
// Reusable text input with:
// - Label
// - Validation error state (red border)
// - Error message text below
// - Optional required indicator
Build src/components/DocumentUpload.tsx


Apply
// Camera/gallery picker with:
// - expo-image-picker integration
// - Preview thumbnail after selection
// - "Take Photo" button
// - "Choose from Gallery" button
// - Remove button
// - Document type label passed as prop
Build Sales Record Form (app/(sales-record)/form.tsx)

Use a ScrollView with keyboard avoiding
Section 1: Customer Information

Customer Name (text, required)
Customer Type: Segmented control (Individual / Company)
Phone Number (text, required)
ID Number (text, conditional: only if Individual)
KRA PIN (text, conditional: required if Company, optional if Individual)
Email (text, optional)
Customer Location (text, required)
Section 2: Bike / Sale Details

Bike Model (dropdown or text, required)
Bike Registration Number (text, required)
Chassis Number (text, required)
Sale Amount (number, required)
Payment Method (dropdown: Cash / M-Pesa / Bank / Financing)
Section 3: Document Uploads (6 document slots)

Invoice Photo (required)
Sales Agreement (required)
ID Document (required)
KRA Document (required)
Bike Photo (required)
Chassis Photo (required)
Section 4: Submission Type (hidden)

Set based on how they entered the form:
From "Record Direct Sale" → direct_sale
From "Convert Freelancer Lead" → freelancer_lead with lead ID
Form validation logic

Real-time validation on field blur
Red border + error message for invalid fields
Disable submit button until all required fields valid
On submit → navigate to preview screen with all data
Document upload flow

Each doc slot opens camera/gallery picker
Show thumbnail after capture
Store as local file URI (not uploaded yet — upload happens at final submission)
Deliverable: Full data-entry form with conditional logic and document capture.

Phase 4 — Preview & Submission (1 day)
Goal: Review all data, upload documents, confirm submission.

Tasks:

Build Preview Screen (app/(sales-record)/preview.tsx)

Receives form data via route params or context
Read-only display of all fields:
Customer info card
Bike/sale details card
Document thumbnails (6 of them)
Warning banner based on type:
Direct Sale: "This is a direct sale. No commission will be generated."
Lead Conversion: "This will generate commission for the linked freelancer."
"Confirm & Submit" button
"Go Back & Edit" button
Build submission logic in src/api/sales.ts


Apply
export async function submitDirectSale(formData: FormData) {
  const response = await api.post('/sales-conversion/direct-sale', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
Document upload process on submit

Before hitting the API, upload each image to Supabase Storage
Get public URLs back
Include URLs in the submission payload
Or better: use FormData and let the backend handle Supabase storage:


Apply
const formData = new FormData()
formData.append('customer_name', data.customerName)
formData.append('invoice_photo', {
  uri: data.invoicePhoto.uri,
  type: 'image/jpeg',
  name: 'invoice.jpg',
} as any)
// ... append all fields and files
Submission states

Loading overlay during upload + API call
Success → "Sale recorded successfully!" with confirmation number
Error → "Submission failed. Please try again." with retry option
On success → navigate back to sales home (reset stack)
Network error handling

Before submit, check network connectivity
If offline → save to local draft queue (AsyncStorage) with "Pending Sync" badge
Auto-retry when connection restores
Deliverable: End-to-end sales recording with document uploads and confirmation.

Phase 5 — Freelancer Portal (1.5 days)
Goal: Freelancers can submit leads, see their stats, and track commissions.

Tasks:

Build src/api/leads.ts


Apply
import api from './client'

export async function submitLead(data: {
  customer_name: string
  phone: string
  customer_type: 'individual' | 'company'
  bike_model: string
  notes?: string
}) {
  const response = await api.post('/portal/leads', data)
  return response.data
}

export async function getFreelancerDashboard() {
  const response = await api.get('/portal/dashboard')
  return response.data // { totalLeads, activeLeads, totalPaid, recentLeads[] }
}
Build Freelancer Dashboard (app/(freelancer)/index.tsx)

Metrics cards row:
"Total Leads" (count)
"Active Leads" (count)
"Total Paid" (KES amount)
"Submit New Lead" button → opens a simplified form
Recent Leads list (FlatList):
Customer name, date, status badge
Commission status (Pending / Approved / Paid)
Pull-to-refresh
Build Lead Submission Form (modal or inline)

Customer Name (required)
Phone Number (required)
Customer Type (Individual / Company)
Bike Model (text)
Notes (optional textarea)
Submit button
Commission tracking details

Each lead item shows status timeline
Statuses: submitted → contacted → converted → commission_approved → commission_paid
Color-coded badges for each status
Deliverable: Freelancer can submit leads and track their performance.

Phase 6 — Public Referral Link (0.5 day)
Goal: Anyone with a referral link can submit a lead without logging in.

Tasks:

Build src/api/referrals.ts


Apply
import api from './client'

export async function submitReferral(data: {
  referrer_name: string
  referrer_phone: string
  customer_name: string
  customer_phone: string
  bike_model?: string
}) {
  const response = await api.post('/api/referrals', data)
  return response.data
}
Build Referral Form (app/(public)/referral.tsx)

Referrer Section:
Referrer Name (required)
Referrer Phone (required)
Referrer Code or Link ID (pre-filled from deep link)
Customer Section:
Customer Name (required)
Customer Phone (required)
Bike Model Interested In (optional)
Submit button
Success screen: "Referral submitted! You'll be notified when this lead converts."
Deep link handling

The referral link (e.g., https://spirospares.com/referral?ref=CODE123) can be handled via:
Universal links on Android
Or simply QR code → pre-fills a referral code field
Parse the ref code from the link and auto-fill in the form
Deliverable: Public users can submit referrals via a simple form.

Phase 7 — Error Handling, Offline Queue, & Polish (1 day)
Goal: Production-quality resilience and UX.

Tasks:

Build network detection


Apply
import NetInfo from '@react-native-community/netinfo'

// In the API client:
NetInfo.addEventListener(state => {
  isOnline = state.isConnected
})
Build offline draft queue

Store failed submissions in AsyncStorage as pending_submissions[]
Show a banner on the home screen: "You have X pending uploads"
"Sync Now" button that retries all queued items
Auto-sync when app comes to foreground and network is available
Build src/components/ErrorBanner.tsx

Animated banner at top of screen
Types: error, warning, success, info
Auto-dismiss for success
Persistent for errors with retry action
Build src/components/LoadingOverlay.tsx

Full-screen semi-transparent overlay
Activity indicator + message text
Used during form submission and data loading
Session expiry handling

In the axios interceptor, on 401:
Clear SecureStore
Emit an event that the auth store listens to
Show a modal: "Your session has expired. Please log in again."
Redirect to login
Form auto-save draft

On the sales form, save partial data to AsyncStorage every 30 seconds
If user navigates away and comes back, prompt: "You have an unsaved draft. Restore it?"
Clear draft on successful submission
Deliverable: Resilient app that handles network issues gracefully.

Phase 8 — Play Store Deployment Prep (1 day)
Goal: Production build, app signing, store listing.

Tasks:

Configure app.json for production


Apply
{
  "expo": {
    "name": "Freelancer-Tamtech",
    "slug": "freelancer-tamtech",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "freelancer-tamtech",
    "android": {
      "package": "com.tamtechtools.freelancerapp",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"
      }
    }
  }
}
Build the APK/AAB

Run
eas build --platform android --profile production
App signing

EAS Build handles this automatically
Or generate your own keystore for manual signing
Play Store listing assets

512x512 px icon
Feature graphic (1024x500 px)
2-4 screenshots per supported device type
App description from the FRD
Internal test track

Upload to Google Play Console → Internal Testing
Add tester emails
Test on at least 3 different Android versions/devices
Deliverable: App is published on Google Play Store (internal or production track).

📊 PHASE SUMMARY
Phase	Name	Duration	Key Deliverable
P0	Project Scaffolding	1 day	Working Expo app with file structure
P1	Auth & Role Routing	1.5 days	Login flow with role-based routing
P2	Sales Record Home	1 day	Dashboard + conversion history
P3	Sales Record Form	1.5 days	Full form with conditional fields + document uploads
P4	Preview & Submission	1 day	End-to-end sales recording
P5	Freelancer Portal	1.5 days	Lead submission + dashboard
P6	Public Referral	0.5 day	No-login referral form
P7	Error Handling & Polish	1 day	Offline queue, network detection, drafts
P8	Play Store Deployment	1 day	Published app
Total		10 days	Production app on Google Play