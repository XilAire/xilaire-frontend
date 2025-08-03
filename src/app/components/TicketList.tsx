'use client';

import React, { useEffect, useState } from 'react';

type Ticket = {
  ticket_id: string; // updated key
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  message: string;
  status: string;
  created_at: string;
};

type Props = {
  tickets: Ticket[];
};

export default function TicketsList({ tickets }: Props) {
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>(tickets);
  const [filterStatus, setFilterStatus] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');

  // Update filtered tickets when tickets, filterStatus or searchTerm change
  React.useEffect(() => {
    let filtered = tickets;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) => t.status.toLowerCase() === filterStatus.toLowerCase());
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (t) =>
          t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTickets(filtered);
  }, [tickets, filterStatus, searchTerm]);

  return (
    <div className="p-6 bg-white rounded shadow-md dark:bg-gray-800 dark:text-white">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <select
          className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>

        <input
          type="text"
          placeholder="Search by email or company"
          className="border px-3 py-2 rounded flex-grow dark:bg-gray-700 dark:border-gray-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tickets List */}
      <ul className="space-y-4">
        {filteredTickets.length === 0 && <li>No tickets found.</li>}
        {filteredTickets.map((ticket) => (
          <li
            key={ticket.ticket_id}
            className="border rounded p-4 shadow-sm hover:shadow-md transition bg-gray-50 dark:bg-gray-700"
          >
            <h3 className="font-bold text-lg">
              {ticket.first_name} {ticket.last_name}{' '}
              <span className="text-sm text-gray-500 dark:text-gray-300">({ticket.email})</span>
            </h3>
            <p>
              <strong>Company:</strong> {ticket.company_name}
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  ticket.status.toLowerCase() === 'open'
                    ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200'
                    : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {ticket.status}
              </span>
            </p>
            <p className="whitespace-pre-wrap">{ticket.message}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Created at: {new Date(ticket.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
