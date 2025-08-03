import React from 'react';

type SummaryCardProps = {
  title: string;
  value: number;
};

export default function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <div
      className="
        bg-white text-gray-900 p-6 rounded-xl shadow border border-gray-200
        dark:bg-gray-800 dark:text-white dark:border-gray-700
        transition-colors duration-300
      "
    >
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
