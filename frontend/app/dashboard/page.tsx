'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { 
  Briefcase, 
  Activity, 
  Users, 
  UserCheck, 
  Plus, 
  Scan, 
  UserPlus, 
  ChevronRight, 
  MapPin, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalLabour: 0,
    totalContractors: 0
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, projectsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/projects')
        ]);
        setStats(statsRes.data.stats);
        setProjects((projectsRes.data.projects || []).slice(0, 3)); // show top 3 active
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const triggerScan = () => {
    // Custom event to trigger Layout's QR Scanner
    window.dispatchEvent(new Event('open-global-scan'));
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="space-y-6 max-w-md mx-auto py-4">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="rounded-full bg-gray-200 h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-gray-200 rounded-2xl animate-pulse"></div>
            <div className="h-28 bg-gray-200 rounded-2xl animate-pulse"></div>
          </div>
          <div className="h-40 bg-gray-200 rounded-2xl animate-pulse"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <div className="max-w-md mx-auto space-y-6 pb-6">
        
        {/* Welcome Profile Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 shadow-xl shadow-indigo-100/50">
          <div className="absolute right-0 bottom-0 translate-y-6 translate-x-4 opacity-15">
            <Sparkles size={160} />
          </div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-indigo-100 text-xs font-semibold uppercase tracking-wider">{getFormattedDate()}</p>
              <h2 className="text-2xl font-black mt-0.5 tracking-tight">
                {getGreeting()}, <span className="text-amber-300">{user?.name || 'User'}</span>
              </h2>
              <p className="text-indigo-200 text-xs mt-1">Super Admin Panel</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-bold text-lg shadow-inner">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider pl-1">Overview Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            
            <Link href="/projects" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-28 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 text-indigo-50/70 group-hover:text-indigo-100 transition-colors">
                <Briefcase size={64} />
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Briefcase size={18} />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.totalProjects}</span>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">Total Projects</p>
              </div>
            </Link>

            <Link href="/projects" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-28 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 text-emerald-50/70 group-hover:text-emerald-100 transition-colors">
                <Activity size={64} />
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-emerald-500">
                <Activity size={18} />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.activeProjects}</span>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">Active Projects</p>
              </div>
            </Link>

            <Link href="/labours" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-28 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 text-rose-50/70 group-hover:text-rose-100 transition-colors">
                <Users size={64} />
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <Users size={18} />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.totalLabour}</span>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">Total Labours</p>
              </div>
            </Link>

            <Link href="/contractors" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-28 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 text-purple-50/70 group-hover:text-purple-100 transition-colors">
                <UserCheck size={64} />
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <UserCheck size={18} />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.totalContractors}</span>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">Contractors</p>
              </div>
            </Link>

          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider pl-1">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            
            <button onClick={triggerScan} className="flex flex-col items-center justify-center p-2.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 rounded-2xl transition-all group">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-150/30 group-hover:scale-105 transition-transform">
                <Scan size={20} />
              </div>
              <span className="text-[10px] font-bold text-indigo-950 mt-2 text-center leading-tight">Quick Scan</span>
            </button>

            <Link href="/projects/add" className="flex flex-col items-center justify-center p-2.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 rounded-2xl transition-all group">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-150/30 group-hover:scale-105 transition-transform">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-bold text-emerald-950 mt-2 text-center leading-tight">Add Project</span>
            </Link>

            <Link href="/labours" className="flex flex-col items-center justify-center p-2.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100/50 rounded-2xl transition-all group">
              <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-150/30 group-hover:scale-105 transition-transform">
                <UserPlus size={20} />
              </div>
              <span className="text-[10px] font-bold text-rose-950 mt-2 text-center leading-tight">Add Labour</span>
            </Link>

            <Link href="/contractors" className="flex flex-col items-center justify-center p-2.5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100/50 rounded-2xl transition-all group">
              <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-150/30 group-hover:scale-105 transition-transform">
                <UserCheck size={20} />
              </div>
              <span className="text-[10px] font-bold text-purple-950 mt-2 text-center leading-tight">Contractors</span>
            </Link>

          </div>
        </div>

        {/* Active Projects List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center pl-1">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Active Projects</h3>
            <Link href="/projects" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
              See All <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center shadow-sm">
                <p className="text-gray-500 text-sm">No active projects found.</p>
                <Link href="/projects/add" className="text-indigo-600 text-xs font-semibold hover:underline mt-2 inline-block">Create one now</Link>
              </div>
            ) : (
              projects.map((project: any) => (
                <div key={project.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-indigo-150 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <Briefcase size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{project.name}</h4>
                      <div className="flex items-center text-gray-500 text-xs mt-0.5 gap-1.5">
                        <MapPin size={12} className="text-gray-400" />
                        <span className="truncate">{project.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Link href={`/projects/${project.id}`} className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-indigo-600 group-hover:text-white text-gray-400 flex items-center justify-center transition-all ml-2 flex-shrink-0">
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider pl-1">Recent Activity</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            
            <div className="flex gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0 ring-4 ring-indigo-50"></div>
              <div>
                <p className="text-xs font-bold text-gray-800">QR Attendance System Enabled</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Quick attendance scanning is fully active via project cards.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0 ring-4 ring-emerald-50"></div>
              <div>
                <p className="text-xs font-bold text-gray-800">Report Date Range Filter Updated</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Reports default to last Saturday-to-Today dynamic ranges.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0 ring-4 ring-amber-50"></div>
              <div>
                <p className="text-xs font-bold text-gray-800">Labour Management Restrictions Applied</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Labour editing is now focused only on contact information and status.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
