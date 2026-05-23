'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Building2, Phone, Briefcase } from 'lucide-react';

export default function GlobalContractors() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const res = await api.get('/contractors');
        setContractors(res.data.contractors);
      } catch (error) {
        toast.error('Failed to load contractors');
      } finally {
        setLoading(false);
      }
    };
    fetchContractors();
  }, []);

  return (
    <Layout title="All Contractors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900">Global Contractor Directory</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : contractors.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No contractors registered across any projects yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contractors.map((contractor: any) => (
            <div key={contractor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{contractor.name}</h3>
                  <p className="text-sm text-gray-500">{contractor.company_name || 'Individual'}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${contractor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {contractor.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-2 text-gray-400" />
                  {contractor.phone}
                </div>
                {contractor.project_id && (
                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <Briefcase size={16} className="mr-2 text-indigo-400" />
                    <Link href={`/projects/${contractor.project_id}/contractors`} className="text-indigo-600 hover:underline">View Project Assignment</Link>
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
