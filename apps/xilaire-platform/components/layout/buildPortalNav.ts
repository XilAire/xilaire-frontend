import type { AccessContext } from "@/lib/portalAccess"
import { getNavigationVisibility } from "@/lib/navigationVisibility"

export type SidebarNavItem = {
  title: string
  href: string
  children?: SidebarNavItem[]
}

export function buildPortalNav(ctx: AccessContext): SidebarNavItem[] {
  const visibility = getNavigationVisibility(ctx)
  const items: SidebarNavItem[] = []

  if (visibility.showDashboard) {
    items.push({
      title: "Dashboard",
      href: "/dashboard",
    })
  }

  if (visibility.showClient) {
    items.push({
      title: "Client Portal",
      href: "/client",
      children: [
        { title: "Overview", href: "/client" },
        { title: "Requests", href: "/client/requests" },
        { title: "Projects", href: "/client/projects" },
        { title: "Estimates", href: "/client/estimates" },
        { title: "Invoices", href: "/client/invoices" },
        { title: "Documents", href: "/client/documents" },
      ],
    })
  }

  if (visibility.showVendor) {
    items.push({
      title: "Vendor Portal",
      href: "/vendor",
      children: [
        { title: "Overview", href: "/vendor" },
        { title: "Projects", href: "/vendor/projects" },
        { title: "Site Visits", href: "/vendor/site-visits" },
        { title: "Estimates", href: "/vendor/estimates" },
        { title: "Invoices", href: "/vendor/invoices" },
        { title: "Documents", href: "/vendor/documents" },
        { title: "Profile", href: "/vendor/profile" },
      ],
    })
  }

  if (visibility.showInfrastructure) {
    items.push({
      title: "Infrastructure",
      href: "/infrastructure",
      children: [
        { title: "Overview", href: "/infrastructure" },
        { title: "Projects", href: "/infrastructure/projects" },
        { title: "Scheduling", href: "/infrastructure/scheduling" },
        { title: "Site Visits", href: "/infrastructure/site-visits" },
        { title: "Estimates", href: "/infrastructure/estimates" },
        { title: "Invoices", href: "/infrastructure/invoices" },
        { title: "Documents", href: "/infrastructure/documents" },
      ],
    })
  }

  if (visibility.showOperations) {
    items.push({
      title: "Operations",
      href: "/operations",
      children: [
        { title: "Overview", href: "/operations" },
        { title: "Intake Queue", href: "/operations/intake" },
        { title: "Assignments", href: "/operations/assignments" },
        { title: "Approvals", href: "/operations/approvals" },
        { title: "Delivery", href: "/operations/delivery" },
      ],
    })
  }

  if (visibility.showFinance) {
    items.push({
      title: "Finance",
      href: "/finance",
      children: [
        { title: "Overview", href: "/finance" },
        { title: "Customer Invoices", href: "/finance/invoices" },
        { title: "Vendor Bills", href: "/finance/vendor-bills" },
        { title: "Recurring Billing", href: "/finance/recurring" },
        { title: "Profitability", href: "/finance/profitability" },
      ],
    })
  }

  if (visibility.showAdmin) {
    items.push({
      title: "Administration",
      href: "/admin",
      children: [
        { title: "Overview", href: "/admin" },
        { title: "Users", href: "/admin/users" },
        { title: "Organizations", href: "/admin/organizations" },
        { title: "Vendors", href: "/admin/vendors" },
        { title: "Compliance", href: "/admin/compliance" },
        { title: "Audit", href: "/admin/audit" },
      ],
    })
  }

  if (visibility.showSystem) {
    items.push({
      title: "System",
      href: "/system",
      children: [
        { title: "Overview", href: "/system" },
        { title: "Entitlements", href: "/system/entitlements" },
        { title: "Settings", href: "/system/settings" },
        { title: "Logs", href: "/system/logs" },
      ],
    })
  }

  return items
}