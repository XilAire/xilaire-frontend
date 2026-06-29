import { stripe } from "./server"

const PRODUCT_NAME = "XilAire Adhoc Invoice Item"

let cachedProductId: string | null = null

export async function getAdhocInvoiceProductId(): Promise<string> {
  if (cachedProductId) return cachedProductId

  const products = await stripe.products.search({
    query: `name:"${PRODUCT_NAME}"`,
    limit: 1,
  })

  if (products.data.length) {
    cachedProductId = products.data[0].id
    return cachedProductId
  }

  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    metadata: {
      system: "xilaire-psa",
      type: "adhoc-invoice",
    },
  })

  cachedProductId = product.id
  return product.id
}
