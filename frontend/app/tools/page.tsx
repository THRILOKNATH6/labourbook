'use client';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { CreditCard, Wrench } from 'lucide-react';

export default function ToolsDashboard() {
  const tools = [
    {
      name: 'ID Cards Generate',
      description: 'Generate and print ID cards for labours in bulk or individually.',
      href: '/tools/id-cards',
      icon: CreditCard,
      color: 'bg-indigo-50 text-indigo-600',
    },
    // Future tools can be added here
  ];

  return (
    <Layout title="Tools">
      <div className="flex items-center mb-6">
        <Wrench className="mr-3 text-indigo-600" size={24} />
        <h2 className="text-xl font-bold text-gray-900">Utility Tools</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.name} href={tool.href}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                <div className={`w-12 h-12 rounded-lg ${tool.color} flex items-center justify-center mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{tool.name}</h3>
                <p className="text-sm text-gray-500 flex-1">{tool.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
