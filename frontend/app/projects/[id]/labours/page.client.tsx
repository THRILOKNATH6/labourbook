'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api, { getServerURL } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, User, Phone, Edit, Trash2, Search, CheckCircle } from 'lucide-react';

export default function LaboursTab() {
  const params = useParams();
  const id = params?.id;
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLabours = async () => {
    try {
      const res = await api.get(`/labours?project_id=${id}`);
      setLabours(res.data.labours);
    } catch (error) {
      toast.error('Failed to load labours');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLabours();
  }, [id]);

  const handleDelete = async (labourId: string) => {
    if (confirm('Are you sure you want to delete this labour?')) {
      try {
        await api.delete(`/labours/${labourId}`);
        toast.success('Labour deleted');
        fetchLabours();
      } catch (error) {
        toast.error('Failed to delete labour');
      }
    }
  };

  const markPresent = async (labourId: string) => {
    try {
      await api.post('/attendance', {
        project_id: id,
        labour_id: labourId,
        attendance_date: new Date().toISOString().split('T')[0],
        status: 'Present',
        check_in: '09:00',
        check_out: '17:00'
      });
      toast.success('Marked Present for today');
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const filteredLabours = labours.filter((l: any) => 
    l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.phone.includes(searchQuery)
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-lg font-bold text-gray-900">Labours</h2>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <Link
            href={`/projects/${id}/labours/add`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium flex-shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Labour</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : labours.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No labours added yet</p>
          <Link href={`/projects/${id}/labours/add`} className="text-indigo-600 font-medium hover:underline">Add first labour</Link>
        </div>
      ) : filteredLabours.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 mb-4">No labours match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLabours.map((labour: any) => (
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
                <div className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">Wage: </span>
                  ₹{labour.daily_wage || 0}/day
                </div>
                {labour.contractor_name && (
                  <div className="text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mt-2">
                    Contractor: {labour.contractor_name}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                 <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${labour.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {labour.status}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${id}/labours/edit/${labour.id}`}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors bg-gray-50 hover:bg-indigo-50 rounded-lg"
                  >
                    <Edit size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
