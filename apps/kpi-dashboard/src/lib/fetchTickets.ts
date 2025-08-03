export async function fetchOpenTickets() {
  const res = await fetch('/api/tickets');  // Adjust to your actual API path
  if (!res.ok) {
    throw new Error('Failed to fetch tickets');
  }
  const data = await res.json();
  return data.tickets;  // or however your JSON response is structured
}
