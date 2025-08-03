'use client';

import { useState } from 'react';

export default function TicketForm() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    const res = await fetch('/api/tickets/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message }),
    });

    if (res.ok) {
      setSubject('');
      setMessage('');
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md p-4 space-y-4 border rounded-md shadow-md">
      <h2 className="text-xl font-semibold">Submit a Support Ticket</h2>

      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        className="w-full p-2 border rounded"
      />

      <textarea
        placeholder="Describe your issue..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        className="w-full p-2 border rounded"
      />

      <button
        type="submit"
        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Submitting...' : 'Submit Ticket'}
      </button>

      {status === 'success' && <p className="text-green-600">✅ Ticket submitted!</p>}
      {status === 'error' && <p className="text-red-600">❌ Something went wrong. Try again.</p>}
    </form>
  );
}
