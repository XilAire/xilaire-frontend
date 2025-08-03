// apps/kpi-dashboard/src/app/layout.tsx
import './globals.css'        // ← must come before anything else

import React, { ReactNode } from 'react'
import ClientLayout from './ClientLayout'

export const metadata = {
  title: 'XilAire KPI Dashboard',
  description: 'Your KPI and automation overview',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
