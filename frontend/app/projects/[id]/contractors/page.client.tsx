'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Building2, Phone } from 'lucide-react';

export default function ContractorsTab() {
  const params = useParams();
  const id = params?.id;
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const fetchContractors = async () => {
    try {
      const res = await api.get(`/contractors?project_id=${id}&limit=100`);
      setContractors(res.data.contractors || []);
    } catch (error) {
      toast.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchContractors();
  }, [id]);

  const toggleStatus = async (contractor: any) => {
    const newStatus = contractor.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/contractors/${contractor.id}`, { status: newStatus });
      toast.success(`Contractor status changed to ${newStatus}`);
      fetchContractors();
    } catch (error) {
      toast.error('Failed to update contractor status');
    }
  };

  const filtered = contractors.filter((c: any) => showActiveOnly ? c.status === 'active' : c.status === 'inactive');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">Contractors</h2>
          <button
            onClick={() => setShowActiveOnly(prev => !prev)}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-lg transition-colors border border-indigo-200/50 shadow-sm allow-interaction"
          >
            {showActiveOnly ? 'Show Inactive' : 'Show Active'}
          </button>
        </div>
        <Link
          href={`/projects/${id}/contractors/add`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Contractor</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">
            {showActiveOnly ? 'No active contractors found' : 'No inactive contractors found'}
          </p>
          {showActiveOnly && (
            <Link href={`/projects/${id}/contractors/add`} className="text-indigo-600 font-medium hover:underline">Add first contractor</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((contractor: any) => (
            <div key={contractor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{contractor.name}</h3>
                    <p className="text-sm text-gray-500">{contractor.company_name || 'Individual'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${contractor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {contractor.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone size={16} className="mr-2 text-gray-400" />
                    {contractor.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users size={16} className="mr-2 text-gray-400" />
                    Capacity: {contractor.labour_capacity || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={() => toggleStatus(contractor)}
                  className={`w-full py-2 px-4 rounded-lg text-xs font-semibold transition-all border text-center ${
                    contractor.status === 'active' 
                      ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                      : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {contractor.status === 'active' ? 'Mark Inactive' : 'Mark Active'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Users = ({ size, className }: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
