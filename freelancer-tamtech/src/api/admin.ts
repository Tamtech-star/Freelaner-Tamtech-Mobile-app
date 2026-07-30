import api from './client'

//  Types 
export interface AdminMetrics {
  metrics: {
    total_freelancers: number
    active_freelancers: number
    total_leads: number
    converted_sales: number
    pending_validations: number
    pending_payments: number
  }
}

export interface DuplicateLeadItem {
  id: string
  metricScore: number | null
  adminRequired: boolean
  autoPassed: boolean
  createdAt: string
  lead: {
    lead_code: string
    customer_full_name: string
    customer_phone: string
    bike_model: string
    county: string
    duplicate_override_reason: string | null
  } | null
}

export interface ConversionReviewItem {
  id: string
  conversionCode: string
  invoiceNumber: string
  bikeModelSold: string
  invoiceDate: string
  quantityPurchased: number
  validationRemarks: string | null
  createdAt: string
  invoice_photo_url?: string
  sales_agreement_url?: string
  lead: {
    lead_code: string
    customer_full_name: string
    customer_phone: string
    bike_model: string
  } | null
}

export interface PendingPaymentItem {
  id: string
  invoice_code: string
  freelancer_name: string
  freelancer_phone?: string
  customer_name: string
  bike_model: string
  quantity: number
  commission_amount_kes: number
  submitted_at: string
}

export interface FreelancerRow {
  id: string
  freelancer_code: string
  display_code: string | null
  full_name: string
  email: string
  mpesa_phone: string | null
  registration_status: string
  created_at: string
}

export interface LeadRow {
  id: string
  lead_code: string
  customer_full_name: string
  customer_id_number: string
  location: string
  county: string
  bike_model: string
  payment_type: string
  quantity_interested: number
  lead_notes: string | null
  lead_status: string
  duplicate_override_status: string
  duplicate_override_reason: string | null
  created_at: string
  freelancer_id: string
  freelancers: { full_name: string; freelancer_code: string } | null
}

export interface FreelancerDetail extends FreelancerRow {
  total_leads: number
  converted_leads: number
  conversion_rate: number
  total_commission_earned: number
  total_commission_paid: number
}

export interface ConversionRatio {
  totalLeads: number
  convertedSales: number
  conversionRatio: number
}

export interface CountyWiseItem {
  county: string
  totalLeads: number
  convertedSales: number
}

export interface ReconciliationItem {
  payment_code: string
  payment_date: string
  transaction_reference: string
  amount_paid_kes: number
}

export interface ReconciliationResponse {
  month: string
  totalRecords: number
  totalPaidKes: number
  items: ReconciliationItem[]
}

export interface ConvertedSaleRow {
  id: string
  conversion_code: string
  submission_type: string
  customer_name: string
  freight: string
  sales_agent_name: string
  commission_kes: string
  sales_invoice_number: string
  bike_model_sold: string
  sale_date: string
  quantity: number
  paid_kes: number
  payment_status: string
  invoice_photo_url: string | null
  agreement_photo_url?: string | null
  id_doc_url?: string | null
  kra_doc_url?: string | null
  bike_photo_url?: string | null
  chassis_photo_url?: string | null
}

export interface PaymentRecordRow {
  id: string
  payment_code: string
  freelancer_name: string
  amount_paid_kes: number
  payment_mode: string
  transaction_reference: string
  payment_date: string
  payment_status: string
  admin_remarks: string
  acknowledgement_status: string
  commission_invoice?: {
    invoice_code: string
    customer_name: string
  }
}

export interface AdminUserRow {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'super_admin'
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

// Dashboard 

export async function getAdminDashboard(): Promise<AdminMetrics> {
  const res = await api.get<AdminMetrics>('/portal/dashboard/admin')
  return res.data
}

//  Review Queue 

export async function getReviewDuplicates(): Promise<DuplicateLeadItem[]> {
  const res = await api.get<{ items: DuplicateLeadItem[] }>('/portal/reviews/duplicates')
  return res.data.items || []
}

export async function getReviewConversions(): Promise<ConversionReviewItem[]> {
  const res = await api.get<{ items: ConversionReviewItem[] }>('/portal/reviews/conversions')
  return res.data.items || []
}

export async function getPendingPayments(): Promise<PendingPaymentItem[]> {
  const res = await api.get<{ items: PendingPaymentItem[] }>('/portal/reviews/pending-payments')
  return res.data.items || []
}

export async function approveRejectDuplicate(
  leadCode: string,
  decision: 'approve' | 'reject'
): Promise<void> {
  await api.patch('/portal/reviews/duplicates', {
    leadCode,
    decision,
    reviewedBy: 'admin.mobile',
  })
}

export async function approveRejectConversion(
  conversionCode: string,
  decision: 'approve' | 'reject'
): Promise<void> {
  await api.patch('/portal/reviews/conversions', {
    conversionCode,
    decision,
    reviewedBy: 'admin.mobile',
  })
}

export async function approvePayment(
  invoiceId: string,
  paymentDetails: {
    paymentMode: string
    transactionReference: string
    amountPaid: string
    adminRemarks: string
  }
): Promise<void> {
  await api.patch('/portal/reviews/pending-payments', {
    invoiceId,
    decision: 'approve',
    reviewedBy: 'admin.mobile',
    paymentDetails,
  })
}

export async function rejectPayment(invoiceId: string): Promise<void> {
  await api.patch('/portal/reviews/pending-payments', {
    invoiceId,
    decision: 'reject',
    reviewedBy: 'admin.mobile',
    paymentDetails: null,
  })
}

// Freelancers 

export async function getFreelancers(): Promise<FreelancerRow[]> {
  const res = await api.get<{ freelancers: FreelancerRow[] }>('/portal/admin/freelancers')
  return res.data.freelancers || []
}

export async function deleteFreelancer(freelancerId: string): Promise<void> {
  await api.post('/admin/freelancers/delete', { freelancerId })
}

export async function getFreelancerById(id: string): Promise<FreelancerDetail> {
  const res = await api.get<FreelancerDetail>(`/portal/admin/freelancers/${id}`)
  return res.data
}

//  Leads 
export async function getAdminLeads(): Promise<LeadRow[]> {
  const res = await api.get<{ leads: LeadRow[] }>('/portal/admin/leads')
  return res.data.leads || []
}

// Converted Sales 

export async function getAllSales(): Promise<ConvertedSaleRow[]> {
  const res = await api.get<{ items: ConvertedSaleRow[] }>('/sales-record/history')
  return res.data.items || []
}

export async function getConvertedSales(): Promise<ConvertedSaleRow[]> {
  const res = await api.get<{ items: ConvertedSaleRow[] }>('/admin/convertedsales')
  return res.data.items || []
}

//  Payment Records 

export async function getPaymentRecords(): Promise<PaymentRecordRow[]> {
  const res = await api.get<{ items: PaymentRecordRow[] }>('/admin/paymentrecords')
  return res.data.items || []
}

// Reports 
export async function getConversionRatio(): Promise<ConversionRatio> {
  const res = await api.get<ConversionRatio>('/portal/reports/conversion-ratio')
  return res.data
}

export async function getCountyWise(): Promise<CountyWiseItem[]> {
  const res = await api.get<{ items: CountyWiseItem[] }>('/portal/reports/county-wise')
  return res.data.items || []
}

export async function getReconciliation(
  month?: string
): Promise<ReconciliationResponse> {
  const res = await api.post<ReconciliationResponse>('/portal/reports/reconciliation', {
    month: month || undefined,
    format: 'json',
  })
  return res.data
}

//  Admin Users 
export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const res = await api.get<{ users: AdminUserRow[] }>('/admin/users')
  return res.data.users || []
}

export async function createAdminUser(data: {
  email: string
  full_name: string
  role: 'admin' | 'super_admin'
}): Promise<void> {
  await api.post('/admin/users', data)
}

export async function toggleAdminActive(
  userId: string,
  isActive: boolean
): Promise<void> {
  await api.patch('/admin/users', { userId, is_active: isActive })
}

export async function changeAdminRole(
  userId: string,
  role: 'admin' | 'super_admin'
): Promise<void> {
  await api.patch('/admin/users', { userId, role })
}
