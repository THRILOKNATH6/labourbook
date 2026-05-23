'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { Edit, Trash2, Settings, AlertCircle, Lock } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProjectSettings() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lockAttendanceDate, setLockAttendanceDate] = useState(false);
  const [isPageUnlocked, setIsPageUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const fetchData = async () => {
    try {
      const [projRes, setRes] = await Promise.all([
        api.get('/projects'),
        api.get('/settings')
      ]);
      setProjects(projRes.data.projects);
      setLockAttendanceDate(setRes.data.settings.lock_attendance_date === 'true');
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPageUnlocked) {
      setLoading(true);
      fetchData();
    }
  }, [isPageUnlocked]);

  const handleToggleLock = async () => {
    try {
      const newValue = !lockAttendanceDate;
      await api.post('/settings', { key: 'lock_attendance_date', value: newValue ? 'true' : 'false' });
      setLockAttendanceDate(newValue);
      toast.success(newValue ? 'Attendance date is now locked to today' : 'Attendance date unlocked');
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  const handlePageUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/settings/validate-password', { password: adminPassword });
      setIsPageUnlocked(true);
      setAdminPassword('');
      toast.success('Settings unlocked');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Incorrect password');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('WARNING: Deleting a project will also permanently delete all associated Labours and Contractors! Are you absolutely sure you want to proceed?')) {
      try {
        await api.delete(`/projects/${id}`);
        toast.success('Project and all its dependencies deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  if (!isPageUnlocked) {
    return (
      <Layout title="Settings">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
            <div className="flex justify-center mb-6 text-indigo-600">
              <Lock size={48} />
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Restricted Area</h2>
            <p className="text-gray-500 text-center mb-8">Please enter your admin password to access system settings.</p>
            
            <form onSubmit={handlePageUnlock}>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin Password"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={!adminPassword} 
                className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Unlock Settings
              </button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2 text-indigo-600 mb-2">
          <Settings size={20} />
          <h2 className="text-xl font-bold">System Settings</h2>
        </div>
        <p className="text-gray-500 text-sm">Manage core configurations and dangerous operations.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Global Configuration</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Lock Attendance Date</h4>
              <p className="text-sm text-gray-500 mt-1">When enabled, users can only mark attendance for the present day. They cannot backdate or future-date attendance.</p>
            </div>
            <button
              onClick={handleToggleLock}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${lockAttendanceDate ? 'bg-indigo-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={lockAttendanceDate}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${lockAttendanceDate ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-900">Project Management</h3>
          <span className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
            {projects.length} Projects
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects to manage</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                  <th className="py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((project: any) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{project.location}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/projects/edit/${project.id}`}
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Edit Project"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-amber-600 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-amber-800">Caution</h4>
          <p className="text-xs text-amber-700 mt-1">
            Deleting a project from the settings page will permanently erase it and all connected Labours and Contractors from the database. This action cannot be undone.
          </p>
        </div>
      </div>

    </Layout>
  );
}
