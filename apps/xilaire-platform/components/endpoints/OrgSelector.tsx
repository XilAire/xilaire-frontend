"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

interface Org {
  id: string
  name: string
  slug: string | null
  is_platform_org: boolean
}

interface Props {
  orgs: Org[]
}

export default function OrgSelector({ orgs }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const filteredOrgs = useMemo(() => {
    if (!query) return orgs

    const q = query.toLowerCase()
    return orgs.filter(org =>
      org.name.toLowerCase().includes(q)
    )
  }, [orgs, query])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search organizations..."
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {/* Org Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrgs.map(org => (
          <button
            key={org.id}
            type="button"
            onClick={() => router.push(`/endpoints/org/${org.id}`)}
            className="rounded-lg border border-border bg-card p-4 text-left
                       hover:shadow-md transition focus:outline-none
                       focus:ring-2 focus:ring-primary/40"
          >
            <div className="font-medium">{org.name}</div>

            {org.is_platform_org && (
              <div className="text-xs text-muted-foreground mt-1">
                Platform Organization
              </div>
            )}
          </button>
        ))}

        {filteredOrgs.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No organizations found
          </div>
        )}
      </div>
    </div>
  )
}
