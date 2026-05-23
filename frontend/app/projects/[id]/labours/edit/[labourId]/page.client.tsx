'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function EditLabour() {
  const params = useParams();
  const id = params?.id;
  const labourId = params?.labourId;
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [contractors, setContractors] = useState([]);
  const [projectStatus, setProjectStatus] = useState('active');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !labourId) return;
      try {
        const [labourRes, contractorsRes, projectRes] = await Promise.all([
          api.get(`/labours/${labourId}`),
          api.get(`/contractors?project_id=${id}`),
          api.get(`/projects/${id}`)
        ]);
        
        reset(labourRes.data.labour);
        setContractors(contractorsRes.data.contractors);
        setProjectStatus(projectRes.data.project.status);
      } catch (error) {
        toast.error('Failed to load data');
        router.push(`/projects/${id}/labours`);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, labourId, reset, router]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      if (key !== 'photo' && key !== 'photo_url' && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });

    if (data.photo?.[0]) formData.append('photo', data.photo[0]);

    try {
      await api.put(`/labours/${labourId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Labour updated successfully');
      router.push(`/projects/${id}/labours`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update labour');
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
          This project is completed or inactive. Editing labour details is disabled.
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
      <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Labour</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Labour Details</h3>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Photo</label>
              <input type="file" accept="image/*" {...register('photo')} className="w-full" />
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

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70">
            {loading ? 'Updating...' : 'Update Labour'}
          </button>
        </div>
      </form>
    </div>
  );
}
