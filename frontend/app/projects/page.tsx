'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Briefcase, MapPin, Calendar, Plus, Edit2, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete project "${name}"?`)) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  return (
    <Layout title="Projects">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Project Directory</h2>
          <p className="text-xs text-gray-500">Manage your active construction projects and locations</p>
        </div>
        <Link
          href="/projects/add"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={16} />
          <span>Add Project</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white text-center py-16 rounded-xl border border-gray-100 shadow-sm max-w-lg mx-auto mt-6">
          <Briefcase size={48} className="mx-auto text-gray-300 mb-4 animate-pulse" />
          <h3 className="font-semibold text-lg text-gray-900 mb-1">No Projects Found</h3>
          <p className="text-gray-500 mb-6 text-sm px-4">Start by adding your first project to track attendance and labour resources.</p>
          <Link
            href="/projects/add"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Create New Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => {
            let statusColor = 'bg-gray-100 text-gray-800';
            if (project.status === 'active') statusColor = 'bg-green-100 text-green-800';
            else if (project.status === 'completed') statusColor = 'bg-blue-100 text-blue-800';
            else if (project.status === 'on_hold') statusColor = 'bg-yellow-100 text-yellow-800';
            else if (project.status === 'cancelled') statusColor = 'bg-red-100 text-red-800';

            return (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md hover:border-indigo-100 transition-all duration-200 group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColor}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/projects/edit/${project.id}`}
                        className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-indigo-600 rounded-lg transition-colors"
                        title="Edit Project"
                      >
                        <Edit2 size={15} />
                      </Link>
                      <button
                        onClick={() => handleDelete(project.id, project.name)}
                        className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <Link href={`/projects/${project.id}`} className="block group/link">
                    <h3 className="font-semibold text-lg text-gray-900 group-hover/link:text-indigo-600 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                  </Link>
                  
                  <p className="text-sm text-gray-500 mt-1 mb-4 line-clamp-2 min-h-[2.5rem]">
                    {project.description || 'No description provided'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-50 space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="truncate">{project.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>Started: {project.start_date ? format(new Date(project.start_date), 'PPP') : 'N/A'}</span>
                  </div>
                  {project.created_by_name && (
                    <div className="text-[10px] text-gray-400 italic pt-1">
                      Created by {project.created_by_name}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 flex gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex-1 text-center py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye size={14} /> View Project
                  </Link>
                  <Link
                    href={`/projects/${project.id}/attendance`}
                    className="flex-1 text-center py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-gray-200/50"
                  >
                    Attendance
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
