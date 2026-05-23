'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';
import { MapPin, Calendar, CheckCircle } from 'lucide-react';

export default function ProjectOverview() {
  const params = useParams();
  const id = params?.id;
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchProject = async () => {
      try {
        const res = await api.get(`/projects/${id}`);
        setProject(res.data.project);
      } catch (error) {
        console.error('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Details</h2>
          <p className="text-gray-500 mt-1">{project.description || 'No description'}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
          project.status === 'completed'
            ? 'bg-blue-100 text-blue-800'
            : project.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : project.status === 'on_hold'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-green-100 text-green-800'
        }`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="p-2 bg-gray-50 rounded-lg"><MapPin size={20} className="text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase">Location</p>
              <p className="font-medium text-gray-900">{project.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <div className="p-2 bg-gray-50 rounded-lg"><Calendar size={20} className="text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase">Start Date</p>
              <p className="font-medium text-gray-900">{format(new Date(project.start_date), 'PPP')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-center text-center">
          <div>
            <CheckCircle size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Select tabs above to manage Labours and Contractors.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
