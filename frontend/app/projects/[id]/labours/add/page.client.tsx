'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import api, { getServerURL } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AddLabour() {
  const params = useParams();
  const id = params?.id;
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [projectStatus, setProjectStatus] = useState('active');
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'existing'
  const [unassignedLabours, setUnassignedLabours] = useState([]);
  const [selectedLabours, setSelectedLabours] = useState<string[]>([]);
  const [fetchingUnassigned, setFetchingUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Fetch project status and contractors
    const fetchData = async () => {
      try {
        const [projectRes, contractorsRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/contractors?project_id=${id}`)
        ]);
        setProjectStatus(projectRes.data.project.status);
        setContractors(contractorsRes.data.contractors);
      } catch (e) {
        console.error(e);
      }
    };
    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'existing' && id) {
      const fetchUnassigned = async () => {
        setFetchingUnassigned(true);
        try {
          const res = await api.get('/labours?unassigned=true');
          setUnassignedLabours(res.data.labours || []);
        } catch (e) {
          toast.error('Failed to load unassigned labours');
        } finally {
          setFetchingUnassigned(false);
        }
      };
      fetchUnassigned();
    }
  }, [activeTab, id]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('project_id', id as string);
    
    Object.keys(data).forEach(key => {
      if (key !== 'photo' && data[key]) {
        formData.append(key, data[key]);
      }
    });

    if (data.photo?.[0]) formData.append('photo', data.photo[0]);

    try {
      await api.post('/labours', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Labour added successfully');
      router.push(`/projects/${id}/labours`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add labour');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSelected = async () => {
    if (selectedLabours.length === 0) {
      toast.error('Please select at least one labourer');
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        selectedLabours.map(labourId => 
          api.put(`/labours/${labourId}/assign`, { project_id: id })
        )
      );
      toast.success('Labours assigned successfully');
      router.push(`/projects/${id}/labours`);
    } catch (error) {
      toast.error('Failed to assign selected labours');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectLabour = (labourId: string) => {
    setSelectedLabours(prev => 
      prev.includes(labourId) 
        ? prev.filter(item => item !== labourId) 
        : [...prev, labourId]
    );
  };

  const filteredUnassigned = unassignedLabours.filter((l: any) => 
    l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone.includes(searchQuery)
  );

  if (['completed', 'cancelled', 'on_hold'].includes(projectStatus)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Workspace Locked</h2>
        <p className="text-sm text-gray-500 mb-6">
          This project is completed or inactive. Adding new labours is disabled.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors allow-interaction"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto">
      <div className="flex border-b border-gray-200 mb-6 allow-interaction">
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors allow-interaction ${
            activeTab === 'new'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Register New Labourer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('existing')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors allow-interaction ${
            activeTab === 'existing'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Add Unassigned / Released
        </button>
      </div>

      {activeTab === 'new' ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input {...register('full_name', { required: 'Name is required' })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message as string}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input {...register('phone', { required: 'Phone is required' })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <input {...register('aadhaar_number')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                <input type="file" accept="image/*" {...register('photo')} className="w-full" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Work Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Type</label>
                <select {...register('skill_type')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select Skill</option>
                  <option value="unskilled">Unskilled</option>
                  <option value="semi_skilled">Semi-Skilled</option>
                  <option value="skilled">Skilled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Wage (₹)</label>
                <input type="number" {...register('daily_wage')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Contractor</label>
                <select {...register('contractor_id')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">None (Direct Company Labour)</option>
                  {contractors.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 allow-interaction">Cancel</button>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70 allow-interaction">
              {loading ? 'Saving...' : 'Save Labour'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-3 items-center allow-interaction">
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none allow-interaction text-sm"
            />
          </div>

          {fetchingUnassigned ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : filteredUnassigned.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">No unassigned or released labourers found.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 allow-interaction">
              {filteredUnassigned.map((labour: any) => (
                <div 
                  key={labour.id} 
                  onClick={() => toggleSelectLabour(labour.id)}
                  className={`flex items-center gap-4 p-4 hover:bg-indigo-50/30 transition-colors cursor-pointer allow-interaction ${
                    selectedLabours.includes(labour.id) ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedLabours.includes(labour.id)}
                    onChange={() => {}} // toggled by parent div click
                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 allow-interaction"
                  />
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {labour.photo_url ? (
                      <img src={`${getServerURL()}${labour.photo_url}`} alt={labour.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs uppercase">{labour.full_name.substring(0,2)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{labour.full_name}</h4>
                    <p className="text-xs text-gray-500 truncate">Phone: {labour.phone} | Skill: {labour.skill_type || 'Unskilled'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 allow-interaction">Cancel</button>
            <button 
              type="button" 
              onClick={handleAssignSelected} 
              disabled={loading || selectedLabours.length === 0} 
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70 allow-interaction"
            >
              {loading ? 'Assigning...' : `Assign Selected (${selectedLabours.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
