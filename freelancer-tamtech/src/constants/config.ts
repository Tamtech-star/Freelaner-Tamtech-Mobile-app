import { Platform } from 'react-native'

// Render backend URL
const PRODUCTION_API_URL = 'https://spirospares.onrendercom/api'
const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:3000/api', // Android emulator to localhost
  ios: 'http://localhost:3000/api',
  default: 'http://localhost:3000/api',
})

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PRODUCTION_API_URL

export const APP_NAME = 'Freelancer-Tamtech'
export const APP_VERSION = '1.0.0'

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_ROLE: 'user_role',
  USER_DATA: 'user_data',
  PENDING_SUBMISSIONS: 'pending_submissions',
  DRAFT_FORM: 'draft_sales_form',
}

export const SUBMISSION_TYPES = {
  DIRECT_SALE: 'direct_sale',
  FREELANCER_LEAD: 'freelancer_lead',
} as const

export const CUSTOMER_TYPES = {
  INDIVIDUAL: 'individual',
  COMPANY: 'company',
} as const

export const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash' },
  { label: 'M-Pesa', value: 'mpesa' },
  { label: 'Bank Transfer', value: 'bank' },
  { label: 'Financing', value: 'financing' },
] as const

export const LEAD_STATUSES = {
  SUBMITTED: 'submitted',
  CONTACTED: 'contacted',
  CONVERTED: 'converted',
  COMMISSION_APPROVED: 'commission_approved',
  COMMISSION_PAID: 'commission_paid',
} as const

export const DOCUMENT_TYPES = [
  { key: 'invoice_photo', label: 'Invoice Photo', required: true },
  { key: 'sales_agreement', label: 'Sales Agreement', required: true },
  { key: 'id_document', label: 'ID Document', required: true },
  { key: 'kra_document', label: 'KRA Document', required: true },
  { key: 'bike_photo', label: 'Bike Photo', required: true },
  { key: 'chassis_photo', label: 'Chassis Photo', required: true },
] as const
