export interface VendorInvoiceBuilder {
  buildInvoice(params: {
    orgId: string
    billingPeriodStart: string
    billingPeriodEnd: string
    markupPercent: number
  }): Promise<any>
}
