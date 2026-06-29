export const OVERAGE_SKU_MAP: Record<
  string,
  {
    stripe_price_id: string
    description: string
  }
> = {
  support_hours: {
    stripe_price_id: "price_support_hours_overage",
    description: "Support Hours – Overage",
  },
  managed_users: {
    stripe_price_id: "price_managed_users_overage",
    description: "Managed Users – Overage",
  },
}