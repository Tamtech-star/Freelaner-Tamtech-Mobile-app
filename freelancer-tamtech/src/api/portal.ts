import api from "./client";

// ─Types matching reference web dashboard 

export type LeadCardItem = {
  id: string;
  lead_code: string;
  customer_full_name: string;
  customer_id_number: string;
  customer_phone?: string;
  location: string;
  county: string;
  payment_type: string;
  quantity_interested: number;
  quantity_purchased?: number | null;
  lead_notes: string | null;
  lead_status: string;
  invoice_status?: string | null;
  duplicate_override_status: string;
  duplicate_override_reason: string | null;
  created_at: string;
};

export type DashboardPayload = {
  freelancer: {
    full_name: string;
    freelancer_code: string;
    display_code: string | null;
  };
  metrics: {
    total_leads_submitted: number;
    active_leads: number;
    pending_processing: number;
    converted_sales: number;
    pending_commissions: number;
    paid_commissions: number;
    total_paid_kes: number;
  };
  payments: Array<{
    payment_code: string;
    payment_date: string;
    amount_paid_kes: number;
    transaction_reference: string;
  }>;
};

export type DetailData = {
  leads: LeadCardItem[];
  conversions?: Array<{
    id: string;
    conversion_code: string;
    quantity_purchased: number;
    lead_id: string;
  }>;
  commissionInvoices?: Array<{
    id: string;
    invoice_status: string;
    lead_id: string;
  }>;
};

// ── API functions matching reference web endpoints ──

export async function getFreelancerDashboard(
  freelancerCode: string
): Promise<DashboardPayload> {
  const res = await api.post("/portal/dashboard/freelancer", {
    freelancerCode,
  });
  if (!res.data || res.data.error) {
    throw new Error(res.data?.error || "Failed to load dashboard.");
  }
  return res.data as DashboardPayload;
}

export async function getFreelancerDetails(
  freelancerCode: string,
  filter: string | null = null
): Promise<DetailData> {
  const res = await api.post("/portal/dashboard/freelancer/details", {
    freelancerCode,
    filter,
  });
  if (!res.data || res.data.error) {
    throw new Error(res.data?.error || "Failed to load details.");
  }
  const payload = res.data as DetailData & { error?: string };

  // Map invoice_status onto leads from commissionInvoices
  if (payload.commissionInvoices?.length) {
    const invoiceByLead = new Map(
      payload.commissionInvoices.map((inv: any) => [inv.lead_id, inv.invoice_status])
    );
    payload.leads = payload.leads.map((lead) => ({
      ...lead,
      invoice_status: invoiceByLead.get(lead.id) || lead.invoice_status,
    }));
  }

  // Map quantity_purchased onto leads from conversions
  if (payload.conversions?.length) {
    const qtyByLead = new Map(
      payload.conversions.map((conv: any) => [conv.lead_id, conv.quantity_purchased])
    );
    payload.leads = payload.leads.map((lead) => ({
      ...lead,
      quantity_purchased: qtyByLead.get(lead.id) || lead.quantity_purchased,
    }));
  }

  return payload;
}

export async function submitLead(payload: Record<string, string>): Promise<{
  leadCode?: string;
  leadStatus?: string;
  customerName?: string;
  duplicateDetected?: boolean;
}> {
  const res = await api.post("/portal/leads", payload);
  if (!res.data || res.data.error) {
    throw new Error(res.data?.error || "Lead submission failed.");
  }
  return res.data;
}

export async function submitConversion(
  formData: FormData
): Promise<{ conversionCode?: string }> {
  const res = await api.post("/portal/conversions", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!res.data || res.data.error) {
    throw new Error(res.data?.error || "Conversion submission failed.");
  }
  return res.data;
}

export async function autoSubmitCommission(
  leadId: string
): Promise<void> {
  await api.post("/portal/commissions/auto-submit", { leadId });
}

export async function downloadCommissionInvoice(
  leadId: string
): Promise<Blob> {
  const res = await api.post(
    "/portal/commissions/invoice",
    { leadId },
    { responseType: "blob" }
  );
  return res.data;
}

export async function acknowledgePayment(payload: {
  paymentCode: string;
  receiptUrl?: string;
  notes?: string;
}): Promise<{ message?: string }> {
  const res = await api.post("/portal/commissions/acknowledge", payload);
  if (!res.data || res.data.error) {
    throw new Error(res.data?.error || "Failed to acknowledge payment.");
  }
  return res.data;
}

export async function downloadReceipt(
  paymentCode: string
): Promise<Blob> {
  const res = await api.post(
    "/portal/commissions/receipt",
    { paymentCode },
    { responseType: "blob" }
  );
  return res.data;
}

export async function lookupPaymentCode(
  leadId: string
): Promise<{ paymentCode?: string }> {
  const res = await api.post("/portal/commissions/lookup-payment", {
    leadId,
  });
  return res.data;
}
