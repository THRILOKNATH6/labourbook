'use client';
import { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { FileText, Users, HardHat, ArrowLeft, CalendarClock, BarChart, Lock } from 'lucide-react';
import api from '@/lib/api';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const id = params?.id;
  const [projectName, setProjectName] = useState('Loading Project...');
  const [projectStatus, setProjectStatus] = useState<string>('active');

  useEffect(() => {
    if (!id) return;
    const fetchProjectDetails = async () => {
      try {
        const res = await api.get(`/projects/${id}`);
        setProjectName(res.data.project.name);
        setProjectStatus(res.data.project.status);
      } catch (e) {
        setProjectName('Project Details');
        setProjectStatus('active');
      }
    };
    fetchProjectDetails();
  }, [id]);

  const isInactive = ['completed', 'cancelled', 'on_hold'].includes(projectStatus);

  const tabs = [
    { name: 'Attendance', href: `/projects/${id}/attendance`, icon: CalendarClock },
    { name: 'Reports', href: `/projects/${id}/reports`, icon: BarChart },
    { name: 'Overview', href: `/projects/${id}`, icon: FileText },
    { name: 'Labour', href: `/projects/${id}/labours`, icon: Users },
    { name: 'Contractors', href: `/projects/${id}/contractors`, icon: HardHat },
  ];

  // If we are on add/edit pages, we might not want to show tabs, but let's show them anyway or hide based on pathname
  const isFormPage = pathname.includes('/add') || pathname.includes('/edit');

  return (
    <Layout title={projectName}>

      {!isFormPage && (
        <div className="bg-white border-b border-gray-200 mb-4 overflow-hidden">
          <div className="flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={14} />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {isInactive && (
        <div className={`p-4 rounded-xl border mb-6 flex items-center gap-3 shadow-sm ${
          projectStatus === 'completed' 
            ? 'bg-blue-50 text-blue-800 border-blue-200' 
            : projectStatus === 'cancelled'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <div className={`p-2 rounded-lg ${
            projectStatus === 'completed'
              ? 'bg-blue-100'
              : projectStatus === 'cancelled'
                ? 'bg-red-100'
                : 'bg-amber-100'
          }`}>
            <Lock size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider">Project is {projectStatus.replace('_', ' ')}</h4>
            <p className="text-[11px] opacity-90 mt-0.5 font-medium">Attendance logs, contractor work records, and labour edits are disabled for this project.</p>
          </div>
        </div>
      )}

      <div className={isInactive ? 'project-inactive-disabled' : ''}>
        {children}
      </div>
    </Layout>
  );
}
