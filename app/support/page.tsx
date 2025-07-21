'use client';

import React, { useEffect, useState } from 'react';

type Ticket = {
  ticket_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  message: string;
  status: string;
  created_at: string;
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string;
  replies?: { message: string; author: string; timestamp: string }[];
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets?status=${filterStatus}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tickets');
      setTickets(data.sampleTickets || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const filteredTickets = tickets.filter(
    (t) =>
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReplyChange = (id: string, value: string) => {
    setReplyText((prev) => ({ ...prev, [id]: value }));
  };

  const handleReplySubmit = async (id: string) => {
    const reply = replyText[id]?.trim();
    if (!reply) return;
    try {
      await fetch(`/api/tickets/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply })
      });
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      fetchTickets();
    } catch (error) {
      console.error('Failed to submit reply');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <h2 className="text-2xl font-bold">Support Tickets</h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-600"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>

        <input
          type="text"
          placeholder="Search by email or company"
          className="border px-3 py-2 rounded flex-grow dark:bg-gray-800 dark:border-gray-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && <p>Loading tickets...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      <ul className="space-y-4 max-h-[600px] overflow-y-auto">
        {filteredTickets.length === 0 && !loading && <li>No tickets found.</li>}
        {filteredTickets.map((ticket) => (
          <li
            key={ticket.ticket_id}
            className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <p className="text-md font-bold">
              {ticket.first_name} {ticket.last_name}{' '}
              <span className="text-gray-600 dark:text-gray-300 font-normal">({ticket.email})</span>
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              Company: <span className="font-medium">{ticket.company_name}</span>
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              Status:{' '}
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                {ticket.status}
              </span>
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              Priority: <span className="uppercase font-semibold">{ticket.priority || 'medium'}</span>
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              Assigned To: {ticket.assigned_to || 'Unassigned'}
            </p>
            <p className="mt-2 text-gray-700 dark:text-gray-300">
              {ticket.message}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Created at: {new Date(ticket.created_at).toLocaleString()}
            </p>

            {/* Replies */}
            {Array.isArray(ticket.replies) && ticket.replies.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="font-semibold text-sm">Replies:</p>
                {ticket.replies.map((r, idx) => (
                  <div key={idx} className="text-sm text-gray-600 dark:text-gray-300 border-l-2 pl-3 border-blue-500">
                    <p><strong>{r.author}</strong>: {r.message}</p>
                    <p className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input */}
            <div className="mt-4">
              <textarea
                placeholder="Write a reply..."
                value={replyText[ticket.ticket_id] || ''}
                onChange={(e) => handleReplyChange(ticket.ticket_id, e.target.value)}
                className="w-full border rounded p-2 text-sm dark:bg-gray-700 dark:border-gray-600"
              />
              <button
                onClick={() => handleReplySubmit(ticket.ticket_id)}
                className="mt-2 bg-blue-600 text-white text-sm px-4 py-1 rounded"
              >
                Submit Reply
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
