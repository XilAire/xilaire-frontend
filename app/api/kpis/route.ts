// File: app/api/kpis/route.ts
export async function GET() {
  const data = [
    { name: 'Mon', value: 24 },
    { name: 'Tue', value: 18 },
    { name: 'Wed', value: 32 },
    { name: 'Thu', value: 45 },
    { name: 'Fri', value: 30 },
    { name: 'Sat', value: 25 },
    { name: 'Sun', value: 40 },
  ];

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}
