'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import api, { getServerURL } from '@/lib/api';
import toast from 'react-hot-toast';
import { User, Phone, MapPin, Briefcase } from 'lucide-react';

export default function GlobalLabours() {
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLabours = async () => {
      try {
        const res = await api.get('/labours');
        setLabours(res.data.labours);
      } catch (error) {
        toast.error('Failed to load labours');
      } finally {
        setLoading(false);
      }
    };
    fetchLabours();
  }, []);

  return (
    <Layout title="All Labours">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900">Global Labour Directory</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : labours.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No labours registered across any projects yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {labours.map((labour: any) => (
            <div key={labour.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
              <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {labour.photo_url ? (
                    <img src={`${getServerURL()}${labour.photo_url}`} alt={labour.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={24} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900 truncate">{labour.full_name}</h3>
                  <p className="text-sm text-gray-500 truncate">{labour.skill_type || 'Unskilled'}</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-2 text-gray-400" />
                  {labour.phone}
                </div>
                {labour.project_name && (
                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <Briefcase size={16} className="mr-2 text-indigo-400" />
                    Project: <Link href={`/projects/${labour.project_id}/labours`} className="text-indigo-600 hover:underline ml-1 truncate">{labour.project_name}</Link>
                  </div>
                )}
                {labour.contractor_name && (
                  <div className="text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mt-2">
                    Contractor: {labour.contractor_name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
