'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api, { getServerURL } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Check, X, Clock, Navigation, Lock, FileSpreadsheet, Plus, Trash2, Copy, Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import SteelMeasurementModal from '@/components/SteelMeasurementModal';

export default function DailyAttendance() {
  const params = useParams();
  const id = params?.id;
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [labours, setLabours] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [activeTab, setActiveTab] = useState<'labour' | 'contractor'>('labour');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openOtPanels, setOpenOtPanels] = useState<Record<number, boolean>>({});
  const [openAdvancePanels, setOpenAdvancePanels] = useState<Record<number, boolean>>({});
  const [isDateLocked, setIsDateLocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [activeContractorIdx, setActiveContractorIdx] = useState<number | null>(null);
  const [projectStatus, setProjectStatus] = useState('active');
  const isInactive = ['completed', 'cancelled', 'on_hold'].includes(projectStatus);

  const openMeasurementSheet = (contractor: any, index: number) => {
    setActiveContractorIdx(index);
    setShowMeasurementModal(true);
  };

  const handleSaveMeasurementSheet = (workedUnits: number, workDetails: any) => {
    if (activeContractorIdx !== null) {
      updateContractorAttendance(activeContractorIdx, 'worked_units', workedUnits.toString(), workDetails);
      setShowMeasurementModal(false);
      setActiveContractorIdx(null);
      toast.success('Measurement sheet applied successfully');
    }
  };

  const toggleOtPanel = (index: number) => {
    setOpenOtPanels(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleAdvancePanel = (index: number) => {
    setOpenAdvancePanels(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Fetch project status
      const projectRes = await api.get(`/projects/${id}`).catch(() => null);
      if (projectRes) {
        setProjectStatus(projectRes.data.project.status);
      }

      // Fetch all labours for project
      const laboursRes = await api.get(`/labours?project_id=${id}&limit=100`);
      const allLabours = laboursRes.data.labours;

      // Fetch settings
      const settingsRes = await api.get('/settings').catch(() => null);
      if (settingsRes && settingsRes.data.settings?.lock_attendance_date === 'true') {
        setIsDateLocked(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        if (date !== today) {
           setDate(today);
           return; // re-fetch will trigger due to date change
        }
      } else {
        setIsDateLocked(false);
      }

      // Fetch marked attendance for today
      const attRes = await api.get(`/attendance?project_id=${id}&date=${date}`);
      const marked = attRes.data.attendance;
      const contractorAtt = attRes.data.contractor_attendance || [];

      // Fetch contractors for project
      const contractorsRes = await api.get(`/contractors?project_id=${id}&limit=100`);
      const allContractors = (contractorsRes.data.contractors || []).filter((c: any) => c.status === 'active');

      const mergedContractors = allContractors.map((c: any) => {
        const existing = contractorAtt.find((ca: any) => ca.contractor_id === c.id);
        return {
          ...c,
          attendance_id: existing?.id,
          num_of_labours: existing?.num_of_labours || '',
          worked_units: existing?.worked_units || '',
          work_details: existing?.work_details || null,
        };
      });
      setContractors(mergedContractors);

      // Merge data
      const merged = allLabours.map((l: any) => {
        const existing = marked.find((m: any) => m.labour_id === l.id);
        return {
          ...l,
          attendance_id: existing?.id,
          status: existing?.status || '',
          check_in: existing?.check_in || '',
          check_out: existing?.check_out || '',
          ot_hours: existing?.ot_hours || '',
          ot_rate: existing?.ot_rate || '',
          ot_note: existing?.ot_note || '',
          advance_amount: existing?.advance_amount || '',
          advance_mode: existing?.advance_mode || 'Cash',
          advance_transaction_id: existing?.advance_transaction_id || '',
        };
      });

      setLabours(merged);
    } catch (error) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAttendance();
  }, [id, date]);

  const markAttendance = async (labourIndex: number, status: string) => {
    const labour: any = labours[labourIndex];
    
    // Optimistic update
    const newLabours: any = [...labours];
    newLabours[labourIndex].status = status;
    if (status === 'Present' && !newLabours[labourIndex].check_in) {
      newLabours[labourIndex].check_in = '09:00';
      newLabours[labourIndex].check_out = '17:00';
    }
    setLabours(newLabours);

    try {
      await api.post('/attendance', {
        project_id: id,
        labour_id: labour.id,
        attendance_date: date,
        status,
        check_in: newLabours[labourIndex].check_in,
        check_out: newLabours[labourIndex].check_out,
        ot_hours: newLabours[labourIndex].ot_hours ? Number(newLabours[labourIndex].ot_hours) : undefined,
        ot_rate: newLabours[labourIndex].ot_rate ? Number(newLabours[labourIndex].ot_rate) : undefined,
        ot_note: newLabours[labourIndex].ot_note,
        advance_amount: newLabours[labourIndex].advance_amount ? Number(newLabours[labourIndex].advance_amount) : undefined,
        advance_mode: newLabours[labourIndex].advance_mode || 'Cash',
        advance_transaction_id: newLabours[labourIndex].advance_transaction_id
      });
      toast.success(`${status} marked for ${labour.full_name}`);
    } catch (error) {
      toast.error('Failed to save attendance');
      fetchAttendance(); // Revert on failure
    }
  };

  const updateTime = async (labourIndex: number, field: string, value: string) => {
    const newLabours: any = [...labours];
    newLabours[labourIndex][field] = value;
    setLabours(newLabours);
    
    const statusToSave = newLabours[labourIndex].status || 'Absent';
    if (!newLabours[labourIndex].status) {
      newLabours[labourIndex].status = 'Absent';
      setLabours(newLabours);
    }
    
    try {
      await api.post('/attendance', {
        project_id: id,
        labour_id: newLabours[labourIndex].id,
        attendance_date: date,
        status: statusToSave,
        check_in: newLabours[labourIndex].check_in,
        check_out: newLabours[labourIndex].check_out,
        ot_hours: newLabours[labourIndex].ot_hours ? Number(newLabours[labourIndex].ot_hours) : undefined,
        ot_rate: newLabours[labourIndex].ot_rate ? Number(newLabours[labourIndex].ot_rate) : undefined,
        ot_note: newLabours[labourIndex].ot_note,
        advance_amount: newLabours[labourIndex].advance_amount ? Number(newLabours[labourIndex].advance_amount) : undefined,
        advance_mode: newLabours[labourIndex].advance_mode || 'Cash',
        advance_transaction_id: newLabours[labourIndex].advance_transaction_id
      });
    } catch (error) {
      toast.error('Failed to update details');
    }
  };

  const updateContractorAttendance = async (index: number, field: string, value: any, updatedWorkDetails?: any) => {
    const newContractors: any = [...contractors];
    newContractors[index][field] = value;
    if (updatedWorkDetails !== undefined) {
      newContractors[index].work_details = updatedWorkDetails;
    }
    setContractors(newContractors);

    try {
      await api.post('/attendance/contractor', {
        project_id: id,
        contractor_id: newContractors[index].id,
        attendance_date: date,
        num_of_labours: newContractors[index].num_of_labours ? Number(newContractors[index].num_of_labours) : 0,
        worked_units: newContractors[index].worked_units ? Number(newContractors[index].worked_units) : 0,
        work_details: newContractors[index].work_details || null
      });
    } catch (error) {
      toast.error('Failed to update contractor attendance');
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/settings/validate-password', { password: unlockPassword });
      setIsDateLocked(false);
      setShowUnlockModal(false);
      setUnlockPassword('');
      toast.success('Date unlocked for this session');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Incorrect password');
    }
  };

  return (
    <div>
      <div className="flex flex-row justify-between items-center mb-4 gap-2">
        <div>
          <h2 className="text-sm md:text-xl font-bold text-gray-900 leading-tight">Daily Attendance & Logs</h2>
          <div className="flex gap-3 mt-0.5 text-[10px] md:text-sm font-medium">
            <Link href={`/projects/${id}/attendance/history`} className="text-indigo-600 hover:underline allow-interaction">View History</Link>
          </div>
        </div>
        
        <div className="flex items-center bg-white p-1 md:p-1.5 rounded-lg border border-gray-200 shadow-sm shrink-0 allow-interaction">
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            disabled={isDateLocked}
            className={`border-none focus:ring-0 text-xs md:text-sm text-gray-700 font-medium py-1 px-1.5 allow-interaction ${isDateLocked ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
            title={isDateLocked ? "Date locked to today by admin" : ""}
          />
          {isDateLocked && (
            <button onClick={() => setShowUnlockModal(true)} className="p-1 text-gray-400 hover:text-indigo-600 transition bg-gray-50 rounded" title="Unlock date picker">
              <Lock size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Tab Control */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6 border border-gray-200/50 allow-interaction">
        <button
          onClick={() => setActiveTab('labour')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all text-center allow-interaction ${
            activeTab === 'labour'
              ? 'bg-white text-indigo-700 shadow-sm font-bold'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
          }`}
        >
          Labour Attendance ({labours.length})
        </button>
        <button
          onClick={() => setActiveTab('contractor')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all text-center allow-interaction ${
            activeTab === 'contractor'
              ? 'bg-white text-indigo-700 shadow-sm font-bold'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
          }`}
        >
          Contractor Daily Log ({contractors.length})
        </button>
      </div>

      {activeTab === 'contractor' && (
        loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : contractors.length === 0 ? (
          <div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-gray-500">No contractors assigned to this project</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contractors.map((contractor: any, index: number) => (
              <div key={contractor.id} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-base">{contractor.name} {contractor.company_name ? `(${contractor.company_name})` : ''}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">Contract: {contractor.contract_type} • Rate: ₹{contractor.unit_price}/{contractor.unit || 'Unit'}</p>
                </div>
                
                {isInactive ? (
                  <div className="flex items-center gap-6 self-start sm:self-auto pt-3 sm:pt-0">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Labours Provided</span>
                      <span className="text-sm font-bold text-gray-900 mt-1">{contractor.num_of_labours || '0'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Work Done</span>
                      <span className="text-sm font-extrabold text-indigo-700 mt-1">{contractor.worked_units || '0.00'} {contractor.unit || 'Units'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 self-start sm:self-auto border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Labours Provided</label>
                      <input 
                        type="number"
                        value={contractor.num_of_labours || ''}
                        onChange={(e) => updateContractorAttendance(index, 'num_of_labours', e.target.value)}
                        placeholder="0"
                        className="w-24 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work Done ({contractor.unit || 'Units'})</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          step="0.01"
                          value={contractor.worked_units ?? ''}
                          onChange={(e) => updateContractorAttendance(index, 'worked_units', e.target.value)}
                          placeholder="0.00"
                          className="w-24 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-right font-mono"
                        />
                        <button
                          onClick={() => openMeasurementSheet(contractor, index)}
                          className={`p-2 rounded-lg transition border ${contractor.work_details ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                          title="Steel Measurement Sheet"
                        >
                          <FileSpreadsheet size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'labour' && (
        loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : labours.length === 0 ? (
          <div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-gray-500">No labours found in this project</p>
          </div>
        ) : (
          <div className="space-y-2">
            {labours.map((labour: any, index) => (
              <div key={labour.id} className="bg-white rounded-lg border border-gray-200 p-2 flex flex-wrap items-center gap-2 sm:gap-4">
                
                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {labour.photo_url ? <img src={`${getServerURL()}${labour.photo_url}`} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs text-gray-900 truncate">{labour.full_name}</h3>
                    <p className="text-[10px] text-gray-500 truncate">{labour.skill_type || 'Unskilled'} {labour.contractor_name ? `• ${labour.contractor_name}` : ''}</p>
                  </div>
                </div>

                {isInactive ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Pill */}
                    {labour.status ? (
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        labour.status === 'Present' 
                          ? 'bg-green-100 text-green-800' 
                          : labour.status === 'Absent' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {labour.status}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-400">
                        Not Marked
                      </span>
                    )}

                    {/* Time Log */}
                    {(labour.status === 'Present' || labour.status === 'Half Day') && (
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        ⏱️ {labour.check_in || '09:00'} - {labour.check_out || '17:00'}
                      </span>
                    )}

                    {/* OT Log */}
                    {parseFloat(labour.ot_hours) > 0 && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        OT: {labour.ot_hours} Hrs @ ₹{labour.ot_rate}/hr {labour.ot_note ? `(${labour.ot_note})` : ''}
                      </span>
                    )}

                    {/* Advance Log */}
                    {parseFloat(labour.advance_amount) > 0 && (
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        Adv: ₹{labour.advance_amount} ({labour.advance_mode}) {labour.advance_transaction_id ? `[Txn: ${labour.advance_transaction_id}]` : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-gray-100 p-0.5 rounded-md">
                        <button 
                          onClick={() => markAttendance(index, 'Present')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${labour.status === 'Present' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-green-700'}`}
                        >
                          P
                        </button>
                        <button 
                          onClick={() => markAttendance(index, 'Absent')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${labour.status === 'Absent' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:text-red-700'}`}
                        >
                          A
                        </button>
                        <button 
                          onClick={() => markAttendance(index, 'Half Day')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${labour.status === 'Half Day' ? 'bg-yellow-500 text-white shadow-sm' : 'text-gray-600 hover:text-yellow-700'}`}
                        >
                          HD
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleAdvancePanel(index)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors border ${openAdvancePanels[index] || parseFloat(labour.advance_amount) > 0 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      Adv
                    </button>

                    {(labour.status === 'Present' || labour.status === 'Half Day') && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white px-1.5 py-1 rounded border border-gray-200">
                          <span className="text-[10px] text-gray-500 font-medium">In</span>
                          <input 
                            type="time" 
                            value={labour.check_in || '09:00'} 
                            onChange={(e) => updateTime(index, 'check_in', e.target.value)}
                            className="text-[10px] font-medium bg-transparent border-none focus:ring-0 p-0 w-[42px]" 
                          />
                        </div>
                        <div className="flex items-center gap-1 bg-white px-1.5 py-1 rounded border border-gray-200">
                          <span className="text-[10px] text-gray-500 font-medium">Out</span>
                          <input 
                            type="time" 
                            value={labour.check_out || '17:00'} 
                            onChange={(e) => updateTime(index, 'check_out', e.target.value)}
                            className="text-[10px] font-medium bg-transparent border-none focus:ring-0 p-0 w-[42px]" 
                          />
                        </div>
                        
                        {labour.status === 'Present' && (
                          <button 
                            onClick={() => toggleOtPanel(index)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors border ${openOtPanels[index] || parseFloat(labour.ot_hours) > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            OT
                          </button>
                        )}
                      </div>
                    )}

                    {(openOtPanels[index] || parseFloat(labour.ot_hours) > 0) && labour.status === 'Present' && (
                      <div className="flex items-center gap-1.5 bg-indigo-50 p-1 rounded border border-indigo-100 flex-1 min-w-[200px]">
                        <div className="flex items-center gap-1 bg-white rounded px-1 py-0.5 border border-indigo-100 shadow-sm">
                          <span className="text-[10px] text-indigo-700 font-medium">Hrs</span>
                          <input 
                            type="number" 
                            value={labour.ot_hours || ''} 
                            onChange={(e) => updateTime(index, 'ot_hours', e.target.value)}
                            placeholder="0"
                            className="text-[10px] font-medium border-none focus:ring-0 p-0 w-8 text-center" 
                          />
                        </div>
                        <div className="flex items-center gap-1 bg-white rounded px-1 py-0.5 border border-indigo-100 shadow-sm">
                          <span className="text-[10px] text-indigo-700 font-medium">Rate</span>
                          <input 
                            type="number" 
                            value={labour.ot_rate || ''} 
                            onChange={(e) => updateTime(index, 'ot_rate', e.target.value)}
                            placeholder="0"
                            className="text-[10px] font-medium border-none focus:ring-0 p-0 w-10 text-center" 
                          />
                        </div>
                        <div className="flex flex-1 items-center bg-white rounded px-1 py-0.5 border border-indigo-100 shadow-sm">
                          <input 
                            type="text" 
                            value={labour.ot_note || ''} 
                            onChange={(e) => updateTime(index, 'ot_note', e.target.value)}
                            placeholder="Note..."
                            className="text-[10px] font-medium border-none focus:ring-0 p-0 w-full" 
                          />
                        </div>
                      </div>
                    )}

                    {(openAdvancePanels[index] || parseFloat(labour.advance_amount) > 0) && (
                      <div className="flex items-center gap-1.5 bg-orange-50 p-1 rounded border border-orange-100 flex-1 min-w-[200px]">
                        <div className="flex items-center gap-1 bg-white rounded px-1 py-0.5 border border-orange-100 shadow-sm">
                          <span className="text-[10px] text-orange-700 font-medium">₹</span>
                          <input 
                            type="number" 
                            value={labour.advance_amount || ''} 
                            onChange={(e) => updateTime(index, 'advance_amount', e.target.value)}
                            placeholder="Amount"
                            className="text-[10px] font-medium border-none focus:ring-0 p-0 w-12 text-center" 
                          />
                        </div>
                        
                        <div className="flex items-center gap-1 bg-white rounded px-1 py-0.5 border border-orange-100 shadow-sm">
                          <button 
                            onClick={() => updateTime(index, 'advance_mode', labour.advance_mode === 'Online' ? 'Cash' : 'Online')}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${labour.advance_mode === 'Online' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {labour.advance_mode === 'Online' ? 'Online' : 'Cash'}
                          </button>
                        </div>

                        {labour.advance_mode === 'Online' && (
                          <div className="flex flex-1 items-center bg-white rounded px-1 py-0.5 border border-orange-100 shadow-sm">
                            <input 
                              type="text" 
                              value={labour.advance_transaction_id || ''} 
                              onChange={(e) => updateTime(index, 'advance_transaction_id', e.target.value)}
                              placeholder="Txn ID..."
                              className="text-[10px] font-medium border-none focus:ring-0 p-0 w-full" 
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>
            ))}
          </div>
        )
      )}

      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <form onSubmit={handleUnlockSubmit}>
              <div className="p-6">
                <div className="flex justify-center mb-4 text-indigo-600">
                  <Lock size={40} />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Unlock Attendance Date</h3>
                <p className="text-sm text-gray-500 text-center mb-6">Enter your admin password to allow backdating for this session.</p>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Admin Password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => {setShowUnlockModal(false); setUnlockPassword('');}} className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={!unlockPassword} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">Unlock</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMeasurementModal && activeContractorIdx !== null && (
        <SteelMeasurementModal 
          contractor={contractors[activeContractorIdx]} 
          date={date}
          onClose={() => {
            setShowMeasurementModal(false);
            setActiveContractorIdx(null);
          }} 
          onSave={handleSaveMeasurementSheet} 
        />
      )}
    </div>
  );
}
