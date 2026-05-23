'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AddContractor() {
  const params = useParams();
  const id = params?.id;
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [projectStatus, setProjectStatus] = useState('active');
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'existing'
  const [unassignedContractors, setUnassignedContractors] = useState([]);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [fetchingUnassigned, setFetchingUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchProjectStatus = async () => {
      try {
        const res = await api.get(`/projects/${id}`);
        setProjectStatus(res.data.project.status);
      } catch (e) {
        console.error(e);
      }
    };
    if (id) fetchProjectStatus();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'existing' && id) {
      const fetchUnassigned = async () => {
        setFetchingUnassigned(true);
        try {
          const res = await api.get('/contractors?unassigned=true');
          setUnassignedContractors(res.data.contractors || []);
        } catch (e) {
          toast.error('Failed to load unassigned contractors');
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
    
    // Add all text fields
    Object.keys(data).forEach(key => {
      if (key !== 'id_proof' && key !== 'agreement' && data[key]) {
        formData.append(key, data[key]);
      }
    });

    // Add files
    if (data.id_proof?.[0]) formData.append('id_proof', data.id_proof[0]);
    if (data.agreement?.[0]) formData.append('agreement', data.agreement[0]);

    try {
      await api.post('/contractors', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Contractor added successfully');
      router.push(`/projects/${id}/contractors`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add contractor');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSelected = async () => {
    if (selectedContractors.length === 0) {
      toast.error('Please select at least one contractor');
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        selectedContractors.map(contractorId => 
          api.put(`/contractors/${contractorId}/assign`, { project_id: id })
        )
      );
      toast.success('Contractors assigned successfully');
      router.push(`/projects/${id}/contractors`);
    } catch (error) {
      toast.error('Failed to assign selected contractors');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectContractor = (contractorId: string) => {
    setSelectedContractors(prev => 
      prev.includes(contractorId) 
        ? prev.filter(item => item !== contractorId) 
        : [...prev, contractorId]
    );
  };

  const filteredUnassigned = unassignedContractors.filter((c: any) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.phone.includes(searchQuery)
  );

  if (['completed', 'cancelled', 'on_hold'].includes(projectStatus)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Workspace Locked</h2>
        <p className="text-sm text-gray-500 mb-6">
          This project is completed or inactive. Adding new contractors is disabled.
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
          Register New Contractor
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
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Business Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor Name *</label>
                <input {...register('name', { required: 'Name is required' })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input {...register('company_name')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input {...register('phone', { required: 'Phone is required' })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" {...register('email')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labour Capacity</label>
                <input type="number" {...register('labour_capacity')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                <select {...register('contract_type')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select Type</option>
                  <option value="fixed">Fixed Rate</option>
                  <option value="variable">Variable Rate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit (e.g., Tons, Sq.Ft)</label>
                <input type="text" list="unit-options" {...register('unit')} placeholder="Tons, Sq.Ft..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                <datalist id="unit-options">
                  <option value="Tons" />
                  <option value="KGs" />
                  <option value="Quintals" />
                  <option value="Sq.Ft" />
                  <option value="Cu.Ft" />
                  <option value="Brass" />
                  <option value="Nos" />
                  <option value="Lump Sum" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                <input type="number" step="0.01" {...register('unit_price')} placeholder="0.00" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof (PDF/Image)</label>
                <input type="file" accept=".pdf,image/*" {...register('id_proof')} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agreement (PDF/Image)</label>
                <input type="file" accept=".pdf,image/*" {...register('agreement')} className="w-full" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 allow-interaction">Cancel</button>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70 allow-interaction">
              {loading ? 'Saving...' : 'Save Contractor'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-3 items-center allow-interaction">
            <input
              type="text"
              placeholder="Search by name, company, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none allow-interaction text-sm"
            />
          </div>

          {fetchingUnassigned ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : filteredUnassigned.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">No unassigned or released contractors found.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 allow-interaction">
              {filteredUnassigned.map((contractor: any) => (
                <div 
                  key={contractor.id} 
                  onClick={() => toggleSelectContractor(contractor.id)}
                  className={`flex items-center gap-4 p-4 hover:bg-indigo-50/30 transition-colors cursor-pointer allow-interaction ${
                    selectedContractors.includes(contractor.id) ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedContractors.includes(contractor.id)}
                    onChange={() => {}} // toggled by parent div click
                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 allow-interaction"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{contractor.name}</h4>
                    <p className="text-xs text-gray-500 truncate">
                      {contractor.company_name ? `Company: ${contractor.company_name} | ` : ''}Phone: {contractor.phone}
                    </p>
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
              disabled={loading || selectedContractors.length === 0} 
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70 allow-interaction"
            >
              {loading ? 'Assigning...' : `Assign Selected (${selectedContractors.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
