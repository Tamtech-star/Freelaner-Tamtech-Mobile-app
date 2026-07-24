// ===== Auth Types =====

export type UserRole = 'sales_agent' | 'freelancer' | 'guest'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

export interface AuthState {
  token: string | null
  role: UserRole | null
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

// ===== Customer Types =====

export type CustomerType = 'individual' | 'company'
export type SubmissionType = 'direct_sale' | 'freelancer_lead'
export type PaymentMethod = 'cash' | 'mpesa' | 'bank' | 'financing'

export interface DocumentFile {
  uri: string
  type: 'image/jpeg' | 'image/png' | 'application/pdf'
  name: string
  uploaded?: boolean
  publicUrl?: string
}

export interface SalesFormData {
  // Customer Information
  customer_name: string
  customer_type: CustomerType
  phone_number: string
  id_number?: string
  kra_pin?: string
  email?: string
  customer_location: string

  // Bike / Sale Details
  bike_model: string
  bike_registration_number: string
  chassis_number: string
  sale_amount: number
  payment_method: PaymentMethod

  // Documents
  documents: Record<string, DocumentFile | null>

  // Metadata
  submission_type: SubmissionType
  linked_lead_id?: string
}

// ===== Sales History Types =====

export interface SaleConversion {
  id: string
  customer_name: string
  customer_type: CustomerType
  phone_number: string
  bike_model: string
  sale_amount: number
  submission_type: SubmissionType
  status: string
  created_at: string
  bike_registration_number?: string
  chassis_number?: string
}

// ===== Freelancer Types =====

export interface LeadSubmission {
  id: string
  customer_name: string
  phone_number: string
  customer_type: CustomerType
  bike_model?: string
  status: string
  commission_status: string
  created_at: string
}

export interface FreelancerDashboard {
  total_leads: number
  active_leads: number
  total_paid: number
  recent_leads: LeadSubmission[]
}

// ===== Referral Types =====

export interface ReferralFormData {
  referrer_name: string
  referrer_phone: string
  referral_code?: string
  customer_name: string
  customer_phone: string
  bike_model?: string
}

// ===== API Response Types =====

export interface ApiResponse<T = unknown> {
  ok: boolean
  message?: string
  data?: T
}

export interface AuthResponse {
  token: string
  role: UserRole
  user: AuthUser
}

export interface SalesHistoryResponse {
  sales: SaleConversion[]
}

export interface FreelancerDashboardResponse {
  dashboard: FreelancerDashboard
}

// ===== Form Validation =====

export interface ValidationError {
  field: string
  message: string
}

export interface FormErrors {
  [key: string]: string | undefined
}
