'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function EditContractor() {
  const params = useParams();
  const id = params?.id;
  const contractorId = params?.contractorId;
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [projectStatus, setProjectStatus] = useState('active');
  const router = useRouter();

  useEffect(() => {
    if (!contractorId) return;
    const fetchData = async () => {
      try {
        const [contractorRes, projectRes] = await Promise.all([
          api.get(`/contractors/${contractorId}`),
          api.get(`/projects/${id}`)
        ]);
        reset(contractorRes.data.contractor);
        setProjectStatus(projectRes.data.project.status);
      } catch (error) {
        toast.error('Failed to fetch contractor');
        router.push(`/projects/${id}/contractors`);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [contractorId, id, reset, router]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      if (key !== 'id_proof' && key !== 'agreement' && key !== 'id_proof_url' && key !== 'agreement_url') {
        formData.append(key, data[key]);
      }
    });

    if (data.id_proof?.[0]) formData.append('id_proof', data.id_proof[0]);
    if (data.agreement?.[0]) formData.append('agreement', data.agreement[0]);

    try {
      await api.put(`/contractors/${contractorId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Contractor updated');
      router.push(`/projects/${id}/contractors`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update contractor');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  if (['completed', 'cancelled', 'on_hold'].includes(projectStatus)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Workspace Locked</h2>
        <p className="text-sm text-gray-500 mb-6">
          This project is completed or inactive. Editing contractor details is disabled.
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
      <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Contractor</h2>
      
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select {...register('status')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Documents (Leave empty to keep existing)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof</label>
              <input type="file" accept=".pdf,image/*" {...register('id_proof')} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agreement</label>
              <input type="file" accept=".pdf,image/*" {...register('agreement')} className="w-full" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70">
            {loading ? 'Updating...' : 'Update Contractor'}
          </button>
        </div>
      </form>
    </div>
  );
}
