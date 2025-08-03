'use client';

interface AutomationTileProps {
  name: string;
  status: 'online' | 'offline' | 'error';
  lastRun: string;
}

export default function AutomationTile({ name, status, lastRun }: AutomationTileProps) {
  const statusColor = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    error: 'bg-red-500',
  }[status];

  return (
    <div className="p-4 border rounded-lg shadow-md w-64">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{name}</h3>
        <span className={`w-3 h-3 rounded-full ${statusColor}`} />
      </div>
      <p className="text-sm text-gray-500 mt-1">Last run: {lastRun}</p>
    </div>
  );
}
