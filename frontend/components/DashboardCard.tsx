import { ReactNode } from 'react';
import Link from 'next/link';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  href?: string;
}

export default function DashboardCard({ title, value, icon, trend, trendUp, href }: DashboardCardProps) {
  const content = (
    <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col transition-all ${href ? 'hover:shadow-md hover:border-indigo-100 hover:ring-1 hover:ring-indigo-100 cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block w-full">{content}</Link>;
  }

  return content;
}
