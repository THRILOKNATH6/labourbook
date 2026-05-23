'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from './ProtectedRoute';
import BottomNav from './BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Scan, X, CheckCircle, User } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import api, { getServerURL } from '@/lib/api';
import toast from 'react-hot-toast';

export default function Layout({ children, title }: { children: React.ReactNode, title: string }) {
  const { logout, user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<any>(null);
  const [existingAttendance, setExistingAttendance] = useState<any>(null);

  useEffect(() => {
    const handleOpenScan = () => setIsScanning(true);
    window.addEventListener('open-global-scan', handleOpenScan);
    return () => window.removeEventListener('open-global-scan', handleOpenScan);
  }, []);

  const markAsAbsent = async (labour: any) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.post('/attendance', {
        project_id: labour.project_id,
        labour_id: labour.id,
        attendance_date: today,
        status: 'Absent'
      });
      
      setExistingAttendance(null);
      setScanSuccess({ ...labour, markedAbsent: true });
      
      setTimeout(() => {
        setScanSuccess(null);
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to update attendance');
      setExistingAttendance(null);
      setIsProcessing(false);
    }
  };

  const handleScan = async (result: any) => {
    if (!result || result.length === 0 || isProcessing) return;
    const qrValue = result[0].rawValue;
    
    setIsProcessing(true);
    try {
      // 1. Get labour details to know project_id
      const labourRes = await api.get(`/labours/${qrValue}`);
      const labour = labourRes.data.labour;
      
      if (!labour) throw new Error('Labour not found');
      
      const today = new Date().toISOString().split('T')[0];
      
      // 2. Check if already marked
      const attendanceRes = await api.get(`/attendance?project_id=${labour.project_id}&date=${today}`);
      const existing = attendanceRes.data.attendance?.find((a: any) => a.labour_id === labour.id);
      
      if (existing && existing.status === 'Present') {
        setExistingAttendance({ labour, attendance: existing });
        return; // Stop here, wait for user action
      }
      
      // 3. Mark attendance
      await api.post('/attendance', {
        project_id: labour.project_id,
        labour_id: labour.id,
        attendance_date: today,
        status: 'Present'
      });
      
      // 3. Show success
      setScanSuccess(labour);
      
      // 4. Hide success after 2 seconds
      setTimeout(() => {
        setScanSuccess(null);
        setIsProcessing(false);
      }, 2000);
      
    } catch (error) {
      toast.error('Failed to process attendance for scanned ID.');
      setIsProcessing(false);
      // Give it a brief pause before allowing next scan
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0 print:pb-0 print:bg-white">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user?.name}
                </span>
                <button
                  onClick={() => setIsScanning(true)}
                  className="p-2 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
                  title="Quick Attendance Scan"
                >
                  <Scan size={20} />
                </button>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        <BottomNav />
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md relative flex flex-col items-center">
            <button 
              onClick={() => { setIsScanning(false); setScanSuccess(null); setExistingAttendance(null); setIsProcessing(false); }}
              className="absolute -top-12 right-0 text-white p-2 flex items-center bg-white/10 rounded-full hover:bg-white/20"
            >
              <X size={24} />
            </button>
            
            {existingAttendance ? (
              <div className="bg-white w-full p-8 rounded-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-100 mb-4 bg-gray-50 flex items-center justify-center">
                   {existingAttendance.labour.photo_url ? (
                     <img src={`${getServerURL()}${existingAttendance.labour.photo_url}`} alt={existingAttendance.labour.full_name} className="w-full h-full object-cover" />
                   ) : (
                     <User size={32} className="text-gray-400" />
                   )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{existingAttendance.labour.full_name}</h3>
                <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-lg font-medium text-sm my-4 border border-amber-200">
                  Attendance already marked as "{existingAttendance.attendance.status}".<br/>
                  <span className="text-amber-900 mt-1 block">Do you want to mark them as Absent?</span>
                </div>
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => { setExistingAttendance(null); setIsProcessing(false); }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => markAsAbsent(existingAttendance.labour)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Yes, mark Absent
                  </button>
                </div>
              </div>
            ) : scanSuccess ? (
              <div className="bg-white w-full p-8 rounded-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${scanSuccess.markedAbsent ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  <CheckCircle size={48} />
                </div>
                <div className={`w-24 h-24 rounded-full overflow-hidden border-4 mb-4 bg-gray-50 flex items-center justify-center ${scanSuccess.markedAbsent ? 'border-red-100' : 'border-indigo-100'}`}>
                   {scanSuccess.photo_url ? (
                     <img src={`${getServerURL()}${scanSuccess.photo_url}`} alt={scanSuccess.full_name} className="w-full h-full object-cover" />
                   ) : (
                     <User size={32} className="text-gray-400" />
                   )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{scanSuccess.full_name}</h3>
                <p className="text-gray-500 mb-4">{scanSuccess.project_name || 'No assigned project'}</p>
                <div className={`px-4 py-2 rounded-full font-medium text-sm ${scanSuccess.markedAbsent ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  Attendance Marked: {scanSuccess.markedAbsent ? 'Absent' : 'Present'}
                </div>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-2xl border-4 border-indigo-500/30">
                <Scanner 
                  onScan={handleScan}
                  components={{ audio: true, finder: true } as any}
                />
                <div className="mt-4 text-center text-white/80">
                  <p>Position QR code within the frame to mark attendance.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
