/* -------------------------------------------------
   CSV UTILITY — SERVER SAFE
------------------------------------------------- */

export function toCSV<T extends Record<string, any>>(rows: T[]): string {
  if (!rows.length) return ""

  const headers = Object.keys(rows[0])

  const escape = (value: any) => {
    if (value === null || value === undefined) return ""
    const str = String(value)
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => escape(row[h])).join(",")
    ),
  ]

  return csv.join("\n")
}
