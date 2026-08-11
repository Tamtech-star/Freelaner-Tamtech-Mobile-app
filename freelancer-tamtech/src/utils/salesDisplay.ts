type SaleDisplaySource = {
  id: string
  conversion_code: string
  submission_type: string
  freight?: string | null
  freelancer_name?: string | null
  payment_type?: string | null
}

type LeadDisplaySource = {
  id: string
  lead_code: string
  payment_type?: string | null
  freelancers?: { full_name: string } | null
}

export function getFreelancerName(sale: SaleDisplaySource): string {
  const explicitName = sale.freelancer_name?.trim()
  if (explicitName) return explicitName

  if (sale.submission_type === "freelancer_lead") {
    const legacyName = sale.freight?.trim()
    if (legacyName && legacyName !== "—") return legacyName
  }

  return "N/A"
}

export function getFreelancerCardName(sale: SaleDisplaySource): string | null {
  if (sale.submission_type !== "freelancer_lead") return null

  const name = getFreelancerName(sale)
  return name === "N/A" ? null : name
}

export function formatPaymentMode(paymentType?: string | null): string {
  const normalized = paymentType?.trim().toLowerCase()
  if (!normalized) return "N/A"
  if (normalized === "cash") return "Cash"
  if (normalized === "loan") return "Loan"
  return paymentType!.trim()
}

export function enrichSalesDisplayFields<T extends SaleDisplaySource>(
  sales: T[],
  leads: LeadDisplaySource[],
): T[] {
  const leadsById = new Map<string, LeadDisplaySource>()
  const leadsByCode = new Map<string, LeadDisplaySource>()

  leads.forEach((lead) => {
    leadsById.set(lead.id, lead)
    leadsByCode.set(lead.lead_code, lead)
  })

  return sales.map((sale) => {
    const lead = leadsById.get(sale.id) || leadsByCode.get(sale.conversion_code)
    if (!lead) return sale

    return {
      ...sale,
      freelancer_name: sale.freelancer_name || lead.freelancers?.full_name || undefined,
      payment_type: sale.payment_type || lead.payment_type || undefined,
    }
  })
}
