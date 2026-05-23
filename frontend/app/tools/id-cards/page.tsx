'use client';
import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import api, { getServerURL } from '@/lib/api';
import toast from 'react-hot-toast';
import { User, Printer, CheckSquare, Square, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function GenerateIDCards() {
  const [labours, setLabours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const filteredLabours = labours.filter(
    (l) =>
      l.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.project_name && l.project_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLabours.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLabours.map((l) => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handlePrint = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one labour to print ID card.');
      return;
    }
    window.print();
  };

  const selectedLabours = labours.filter((l) => selectedIds.has(l.id));

  return (
    <Layout title="Generate ID Cards">
      <div className="print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">ID Card Generator</h2>
            <p className="text-sm text-gray-500">Select labours to generate their ID cards</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={handlePrint}
              disabled={selectedIds.size === 0}
              className="flex-1 md:flex-none flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
            >
              <Printer size={18} className="mr-2" />
              Print Selected ({selectedIds.size})
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, phone or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={handleSelectAll}
            className="flex items-center text-sm font-medium text-gray-700 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100"
          >
            {selectedIds.size === filteredLabours.length && filteredLabours.length > 0 ? (
              <><CheckSquare size={16} className="mr-2 text-indigo-600" /> Deselect All</>
            ) : (
              <><Square size={16} className="mr-2 text-gray-400" /> Select All</>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="p-4 border-b w-12 text-center">Select</th>
                    <th className="p-4 border-b">Labour Info</th>
                    <th className="p-4 border-b">Project & Skill</th>
                    <th className="p-4 border-b">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabours.map((labour) => (
                    <tr
                      key={labour.id}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${
                        selectedIds.has(labour.id) ? 'bg-indigo-50/30' : ''
                      }`}
                      onClick={() => toggleSelect(labour.id)}
                    >
                      <td className="p-4 text-center">
                        {selectedIds.has(labour.id) ? (
                          <CheckSquare size={20} className="text-indigo-600 mx-auto" />
                        ) : (
                          <Square size={20} className="text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {labour.photo_url ? (
                              <img
                                src={`${getServerURL()}${labour.photo_url}`}
                                alt={labour.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <User size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{labour.full_name}</p>
                            <p className="text-xs text-gray-500">Joined: {new Date(labour.joining_date || labour.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-gray-900">{labour.project_name || 'Unassigned'}</p>
                        <p className="text-xs text-gray-500">{labour.skill_type || 'General'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-900">{labour.phone}</p>
                      </td>
                    </tr>
                  ))}
                  {filteredLabours.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No labours found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Print View Only */}
      <div className="hidden print:flex flex-wrap gap-8 justify-center">
        {selectedLabours.map((labour) => (
          <div
            key={labour.id}
            className="w-[54mm] h-[86mm] border-2 border-gray-800 rounded-xl bg-white flex flex-col items-center relative overflow-hidden"
            style={{ breakInside: 'avoid' }}
          >
            {/* Header / Banner */}
            <div className="w-full h-12 bg-indigo-600 flex items-center justify-center">
              <h1 className="text-white font-bold text-sm tracking-widest uppercase">Labour Book</h1>
            </div>

            {/* Photo */}
            <div className="w-20 h-20 rounded-full bg-gray-100 border-4 border-white shadow-sm -mt-10 overflow-hidden z-10 flex items-center justify-center">
              {labour.photo_url ? (
                <img
                  src={`${getServerURL()}${labour.photo_url}`}
                  alt={labour.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-gray-400" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 w-full px-3 py-2 flex flex-col items-center text-center">
              <h2 className="font-bold text-lg leading-tight text-gray-900">{labour.full_name}</h2>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1 mb-2">
                {labour.skill_type || 'General Labour'}
              </span>

              <div className="w-full text-xs text-left space-y-1 mt-1 text-gray-700">
                <div className="flex justify-between border-b border-gray-100 pb-0.5">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-medium">{labour.phone}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-0.5">
                  <span className="text-gray-500">Project:</span>
                  <span className="font-medium truncate w-24 text-right">{labour.project_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-0.5">
                  <span className="text-gray-500">Joined:</span>
                  <span className="font-medium">
                    {new Date(labour.joining_date || labour.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="w-full bg-gray-50 p-2 flex flex-col items-center justify-center border-t border-gray-200">
              <QRCodeSVG
                value={labour.id}
                size={50}
                level="M"
                includeMargin={false}
              />
              <span className="text-[8px] text-gray-400 mt-1 font-mono tracking-tighter">ID: {labour.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
