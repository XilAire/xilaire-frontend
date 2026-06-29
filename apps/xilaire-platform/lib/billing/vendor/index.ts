import { buildInvoiceFromPax8 } from "./Pax8/buildInvoiceFromPax8"
import { buildInvoiceFromIngram } from "./Ingram/buildInvoiceFromIngram"

export async function buildInvoiceByVendor(vendor: string, params: any) {
  switch (vendor) {
    case "pax8":
      return buildInvoiceFromPax8(params)
    case "ingram":
      return buildInvoiceFromIngram(params)
    default:
      throw new Error(`Unsupported vendor: ${vendor}`)
  }
}
