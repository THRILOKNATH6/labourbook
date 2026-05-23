'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Share2, FileSpreadsheet, QrCode, X } from 'lucide-react';
import SteelMeasurementModal from '@/components/SteelMeasurementModal';
import { Scanner } from '@yudiel/react-qr-scanner';

const formatLocalDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getLastSundayToSaturday = () => {
  const today = new Date();
  const day = today.getDay();
  
  const to = new Date(today);
  const from = new Date(today);
  
  const daysSinceLastSaturday = (day + 1) % 7 || 7;
  from.setDate(today.getDate() - daysSinceLastSaturday);
  
  return {
    from: formatLocalDate(from),
    to: formatLocalDate(to)
  };
};

export default function MonthlyReports() {
  const params = useParams();
  const id = params?.id;
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [report, setReport] = useState<any[]>([]);
  const [contractorReport, setContractorReport] = useState<any[]>([]);
  const [dailyReport, setDailyReport] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'labour' | 'contractor' | 'daily'>('daily');
  const [reportInterval, setReportInterval] = useState<'daily' | 'weekly' | '15_days' | 'monthly' | 'yearly'>('daily');
  const [isScanningQR, setIsScanningQR] = useState(false);

  const [selectedLabour, setSelectedLabour] = useState<any>(null);
  const [labourDetails, setLabourDetails] = useState<any[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [contractorDetails, setContractorDetails] = useState<any[]>([]);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [activeLogForModal, setActiveLogForModal] = useState<any>(null);

  const openViewMeasurementSheet = (log: any) => {
    setActiveLogForModal(log);
    setShowMeasurementModal(true);
  };
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Set default date range on mount
  useEffect(() => {
    const range = getLastSundayToSaturday();
    setFromDate(range.from);
    setToDate(range.to);
  }, []);

  const handleRowClick = async (labour: any) => {
    setSelectedLabour(labour);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/attendance/labour/${labour.labour_id}/monthly?project_id=${id}&from=${fromDate}&to=${toDate}`);
      setLabourDetails(res.data.details);
    } catch (error) {
      toast.error('Failed to load detailed logs');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleQRScan = async (result: any) => {
    if (!result || result.length === 0) return;
    const qrValue = result[0].rawValue;
    setIsScanningQR(false);
    
    // 1. Try to find the labour in the report list
    const matched = report.find((r: any) => String(r.labour_id) === String(qrValue));
    if (matched) {
      handleRowClick(matched);
      toast.success(`Found report for ${matched.full_name}`);
    } else {
      // 2. Fetch from database if not in the current list
      try {
        setLoadingDetails(true);
        const labourRes = await api.get(`/labours/${qrValue}`);
        const labour = labourRes.data.labour;
        if (!labour) {
          toast.error('Labour not found for scanned QR');
          return;
        }
        
        const mockLabour = {
          labour_id: labour.id,
          full_name: labour.full_name,
          daily_wage: labour.daily_wage || 0,
          total_present: 0,
          total_half_day: 0,
          total_absent: 0,
          total_ot_amount: 0,
          total_advance_amount: 0
        };
        
        const res = await api.get(`/attendance/labour/${labour.id}/monthly?project_id=${id}&from=${fromDate}&to=${toDate}`);
        const logs = res.data.details || [];
        
        const presents = logs.filter((l: any) => l.status === 'Present').length;
        const halfDays = logs.filter((l: any) => l.status === 'Half Day').length;
        const absents = logs.filter((l: any) => l.status === 'Absent').length;
        const otAmt = logs.reduce((sum: number, l: any) => sum + (Number(l.ot_hours || 0) * Number(l.ot_rate || 0)), 0);
        const advAmt = logs.reduce((sum: number, l: any) => sum + Number(l.advance_amount || 0), 0);
        
        mockLabour.total_present = presents;
        mockLabour.total_half_day = halfDays;
        mockLabour.total_absent = absents;
        mockLabour.total_ot_amount = otAmt;
        mockLabour.total_advance_amount = advAmt;
        
        setSelectedLabour(mockLabour);
        setLabourDetails(logs);
        toast.success(`Found report for ${labour.full_name}`);
      } catch (err) {
        toast.error('Error fetching scanned labour details');
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handleContractorRowClick = async (contractor: any) => {
    setSelectedContractor(contractor);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/attendance/contractor/${contractor.contractor_id}/monthly?project_id=${id}&from=${fromDate}&to=${toDate}`);
      setContractorDetails(res.data.details);
    } catch (error) {
      toast.error('Failed to load detailed logs');
    } finally {
      setLoadingDetails(false);
    }
  };

  const generateMonthlyPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    pdf.setFontSize(18);
    pdf.setTextColor(31, 41, 55);
    pdf.text(project ? project.name : 'Project Report', 14, 20);
    
    pdf.setFontSize(14);
    pdf.setTextColor(79, 70, 229);
    pdf.text(`Labour Attendance Report`, 14, 28);
    
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Date Range: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`, 14, 34);

    const tableData = report.map((row: any) => {
      const regularSalary = (Number(row.total_present) + Number(row.total_half_day)*0.5) * Number(row.daily_wage || 0);
      const otAmt = Number(row.total_ot_amount || 0);
      const advances = Number(row.total_advance_amount || 0);
      const netSalary = regularSalary + otAmt - advances;

      return [
        `${row.full_name}\n(${row.contractor_name || 'Direct'} - Rs.${row.daily_wage || 0}/day)`,
        row.total_present,
        row.total_absent,
        row.total_half_day,
        `${Number(row.total_ot_hours || 0).toFixed(1)} hrs`,
        `Rs. ${otAmt.toFixed(0)}`,
        `Rs. ${advances.toFixed(0)}`,
        `Rs. ${netSalary.toFixed(0)}`
      ];
    });

    autoTable(pdf, {
      startY: 40,
      head: [['Labour Details', 'P', 'A', 'HD', 'OT Hrs', 'OT Amt', 'Advances', 'Net Payable']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center', textColor: [21, 128, 61], fontStyle: 'bold' },
        2: { halign: 'center', textColor: [220, 38, 38], fontStyle: 'bold' },
        3: { halign: 'center', textColor: [202, 138, 4], fontStyle: 'bold' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold', textColor: [17, 24, 39] }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    return pdf;
  };

  const generateContractorMonthlyPDF = () => {
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
    
    pdf.setFontSize(18);
    pdf.setTextColor(31, 41, 55);
    pdf.text(project ? project.name : 'Project Report', 14, 20);
    
    pdf.setFontSize(14);
    pdf.setTextColor(79, 70, 229);
    pdf.text(`Contractor Report`, 14, 28);
    
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Date Range: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`, 14, 34);

    const tableData = contractorReport.map((row: any) => {
      const payable = Number(row.total_worked_units || 0) * Number(row.unit_price || 0);
      return [
        row.name,
        row.company_name || '-',
        row.contract_type || '-',
        row.total_labours_provided || '0',
        `${row.total_worked_units || '0'} ${row.unit || ''}`,
        `Rs. ${Number(row.unit_price || 0).toFixed(0)}/${row.unit || 'unit'}`,
        `Rs. ${payable.toFixed(0)}`
      ];
    });

    autoTable(pdf, {
      startY: 40,
      head: [['Contractor', 'Company', 'Type', 'Total Labours', 'Total Units', 'Unit Price', 'Total Payable']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold', textColor: [17, 24, 39] }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    return pdf;
  };

  const generateContractorDetailPDF = () => {
    if (!selectedContractor) return null;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    pdf.setFontSize(18);
    pdf.setTextColor(31, 41, 55);
    pdf.text(project ? project.name : 'Project Report', 14, 20);
    
    pdf.setFontSize(14);
    pdf.setTextColor(79, 70, 229);
    pdf.text(`${selectedContractor.name}`, 14, 28);
    
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Date Range: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}   |   Unit Price: Rs. ${selectedContractor.unit_price || 0}/${selectedContractor.unit}`, 14, 34);

    const tableData = contractorDetails.map((log: any) => {
      const payable = Number(log.worked_units || 0) * Number(selectedContractor.unit_price || 0);
      return [
        new Date(log.attendance_date).toLocaleDateString(),
        log.num_of_labours || '0',
        `${log.worked_units || '0'} ${selectedContractor.unit}`,
        `Rs. ${payable.toFixed(0)}`
      ];
    });

    autoTable(pdf, {
      startY: 40,
      head: [['Date', 'Labours Provided', 'Worked Units', 'Payable']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    const payable = Number(selectedContractor.total_worked_units || 0) * Number(selectedContractor.unit_price || 0);
    const finalY = (pdf as any).lastAutoTable.finalY || 40;
    
    pdf.setFontSize(12);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Net Payable: Rs. ${payable.toFixed(0)}`, 14, finalY + 15);

    return pdf;
  };

  const generateLabourPDF = () => {
    if (!selectedLabour) return null;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    pdf.setFontSize(18);
    pdf.setTextColor(31, 41, 55);
    pdf.text(project ? project.name : 'Project Report', 14, 20);
    
    pdf.setFontSize(14);
    pdf.setTextColor(79, 70, 229);
    pdf.text(`${selectedLabour.full_name}`, 14, 28);
    
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Date Range: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}   |   Wage: Rs. ${selectedLabour.daily_wage || 0}/day`, 14, 34);

    const tableData = labourDetails.map((log: any) => {
      let otText = '-';
      if (Number(log.ot_hours) > 0) {
        otText = `${Number(log.ot_hours).toFixed(1)}h @ Rs.${log.ot_rate}`;
      }
      let advanceText = '-';
      if (Number(log.advance_amount) > 0) {
        advanceText = `Rs.${Number(log.advance_amount).toFixed(0)} (${log.advance_mode})`;
      }
      return [
        new Date(log.attendance_date).toLocaleDateString(),
        log.status,
        (log.status === 'Present' || log.status === 'Half Day') ? `${log.check_in || '--:--'} - ${log.check_out || '--:--'}` : '-',
        otText,
        advanceText
      ];
    });

    autoTable(pdf, {
      startY: 40,
      head: [['Date', 'Status', 'In / Out', 'OT', 'Advance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          const status = data.cell.raw;
          data.cell.styles.fontStyle = 'bold';
          if (status === 'Present') data.cell.styles.textColor = [21, 128, 61];
          if (status === 'Absent') data.cell.styles.textColor = [220, 38, 38];
          if (status === 'Half Day') data.cell.styles.textColor = [202, 138, 4];
        }
      }
    });

    const netPayable = ((Number(selectedLabour.total_present) + Number(selectedLabour.total_half_day)*0.5) * Number(selectedLabour.daily_wage || 0) + Number(selectedLabour.total_ot_amount || 0) - Number(selectedLabour.total_advance_amount || 0)).toFixed(0);
    const finalY = (pdf as any).lastAutoTable.finalY || 40;
    
    pdf.setFontSize(12);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Net Payable: Rs. ${netPayable}`, 14, finalY + 15);

    return pdf;
  };

  const generateDailyPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    pdf.setFontSize(18);
    pdf.setTextColor(31, 41, 55);
    pdf.text(project ? project.name : 'Project Report', 14, 20);
    
    pdf.setFontSize(14);
    pdf.setTextColor(79, 70, 229);
    pdf.text(`Expenditure Report`, 14, 28);
    
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Date Range: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`, 14, 34);

    let totalLabour = 0;
    let totalContractor = 0;

    const tableData = getGroupedDailyReport().map((row: any) => {
      totalLabour += Number(row.labour_cost || 0) + Number(row.ot_cost || 0);
      totalContractor += Number(row.contractor_cost || 0);
      
      return [
        row.isGrouped ? row.date : new Date(row.date).toLocaleDateString(),
        row.labours_present || '0',
        `Rs. ${(Number(row.labour_cost || 0) + Number(row.ot_cost || 0)).toFixed(0)}`,
        `Rs. ${Number(row.contractor_cost || 0).toFixed(0)}`,
        `Rs. ${Number(row.advance_amount || 0).toFixed(0)}`,
        `Rs. ${Number(row.total_expenditure || 0).toFixed(0)}`
      ];
    });

    autoTable(pdf, {
      startY: 40,
      head: [['Date', 'Labours Present', 'Labour Cost', 'Contractor Cost', 'Advances', 'Total Expense']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold', textColor: [17, 24, 39] }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] }
    });

    const finalY = (pdf as any).lastAutoTable.finalY || 40;
    
    pdf.setFontSize(11);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total Labour Cost: Rs. ${totalLabour.toFixed(0)}`, 14, finalY + 10);
    pdf.text(`Total Contractor Cost: Rs. ${totalContractor.toFixed(0)}`, 14, finalY + 16);
    
    pdf.setFontSize(13);
    pdf.text(`Grand Total Expenditure: Rs. ${(totalLabour + totalContractor).toFixed(0)}`, 14, finalY + 24);

    return pdf;
  };

  const handleExportPDF = (type: 'monthly' | 'labour' | 'contractor' | 'contractor_detail' | 'daily') => {
    try {
      let pdf;
      let filename;
      if (type === 'monthly') {
        pdf = generateMonthlyPDF();
        filename = `Labour_Report_${fromDate}_to_${toDate}.pdf`;
      } else if (type === 'contractor') {
        pdf = generateContractorMonthlyPDF();
        filename = `Contractor_Report_${fromDate}_to_${toDate}.pdf`;
      } else if (type === 'contractor_detail') {
        pdf = generateContractorDetailPDF();
        filename = `Contractor_Detail_${selectedContractor?.name}_${fromDate}_to_${toDate}.pdf`;
      } else if (type === 'daily') {
        pdf = generateDailyPDF();
        filename = `Daily_Expenditure_${fromDate}_to_${toDate}.pdf`;
      } else {
        pdf = generateLabourPDF();
        filename = `Labour_Detail_${selectedLabour?.full_name}_${fromDate}_to_${toDate}.pdf`;
      }
      if (!pdf) return;
      pdf.save(filename);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleSharePDF = async (type: 'monthly' | 'labour' | 'contractor' | 'contractor_detail' | 'daily') => {
    try {
      let pdf;
      let filename;
      if (type === 'monthly') {
        pdf = generateMonthlyPDF();
        filename = `Labour_Report_${fromDate}_to_${toDate}.pdf`;
      } else if (type === 'contractor') {
        pdf = generateContractorMonthlyPDF();
        filename = `Contractor_Report_${fromDate}_to_${toDate}.pdf`;
      } else if (type === 'contractor_detail') {
        pdf = generateContractorDetailPDF();
        filename = `Contractor_Detail_${selectedContractor?.name}_${fromDate}_to_${toDate}.pdf`;
      } else if (type === 'daily') {
        pdf = generateDailyPDF();
        filename = `Daily_Expenditure_${fromDate}_to_${toDate}.pdf`;
      } else {
        pdf = generateLabourPDF();
        filename = `Labour_Detail_${selectedLabour?.full_name}_${fromDate}_to_${toDate}.pdf`;
      }
      if (!pdf) return;

      if (navigator.share) {
        const blob = pdf.output('blob');
        const file = new File([blob], filename, { type: 'application/pdf' });
        await navigator.share({
          title: filename,
          files: [file]
        });
      } else {
        toast.error('Web Share API is not supported in your browser');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    if (!id || !fromDate || !toDate) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const [res, projRes, contractRes, dailyRes] = await Promise.all([
          api.get(`/attendance/monthly?project_id=${id}&from=${fromDate}&to=${toDate}`),
          api.get(`/projects/${id}`),
          api.get(`/attendance/contractor/monthly?project_id=${id}&from=${fromDate}&to=${toDate}`),
          api.get(`/attendance/daily-expenditure?project_id=${id}&from=${fromDate}&to=${toDate}`)
        ]);
        setReport(res.data.report);
        setProject(projRes.data.project);
        setContractorReport(contractRes.data.report);
        setDailyReport(dailyRes.data.report);
      } catch (error) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id, fromDate, toDate]);

  const getGroupedDailyReport = () => {
    const list = dailyReport || [];
    if (reportInterval === 'daily') {
      return list.filter((row: any) => Number(row.labours_present || 0) > 0 || Number(row.total_expenditure || 0) > 0);
    }
    
    if (reportInterval === 'weekly') {
      const weeks: { [key: string]: any[] } = {};
      
      list.forEach((row: any) => {
        const dateObj = new Date(row.date);
        const day = dateObj.getDay();
        
        // Find Sunday of this week
        const sunday = new Date(dateObj);
        sunday.setDate(dateObj.getDate() - day);
        const sundayStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Find Saturday of this week
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        const saturdayStr = saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const weekKey = `${sundayStr} - ${saturdayStr}`;
        if (!weeks[weekKey]) {
          weeks[weekKey] = [];
        }
        weeks[weekKey].push(row);
      });
      
      return Object.keys(weeks).map(weekName => {
        const rows = weeks[weekName];
        const labours_present = rows.reduce((sum: number, r: any) => sum + Number(r.labours_present || 0), 0);
        const labour_cost = rows.reduce((sum: number, r: any) => sum + Number(r.labour_cost || 0), 0);
        const ot_cost = rows.reduce((sum: number, r: any) => sum + Number(r.ot_cost || 0), 0);
        const contractor_cost = rows.reduce((sum: number, r: any) => sum + Number(r.contractor_cost || 0), 0);
        const advance_amount = rows.reduce((sum: number, r: any) => sum + Number(r.advance_amount || 0), 0);
        const total_expenditure = rows.reduce((sum: number, r: any) => sum + Number(r.total_expenditure || 0), 0);
        
        return {
          date: weekName,
          labours_present,
          labour_cost,
          ot_cost,
          contractor_cost,
          advance_amount,
          total_expenditure,
          isGrouped: true
        };
      }).filter(w => w.total_expenditure > 0 || w.labours_present > 0);
    }
    
    if (reportInterval === '15_days') {
      const periods: { [key: string]: any[] } = {};
      
      list.forEach((row: any) => {
        const dateObj = new Date(row.date);
        const day = dateObj.getDate();
        const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        const periodKey = day <= 15 ? `${monthName} (1st - 15th)` : `${monthName} (16th - End)`;
        
        if (!periods[periodKey]) {
          periods[periodKey] = [];
        }
        periods[periodKey].push(row);
      });
      
      return Object.keys(periods).map(periodName => {
        const rows = periods[periodName];
        const labours_present = rows.reduce((sum: number, r: any) => sum + Number(r.labours_present || 0), 0);
        const labour_cost = rows.reduce((sum: number, r: any) => sum + Number(r.labour_cost || 0), 0);
        const ot_cost = rows.reduce((sum: number, r: any) => sum + Number(r.ot_cost || 0), 0);
        const contractor_cost = rows.reduce((sum: number, r: any) => sum + Number(r.contractor_cost || 0), 0);
        const advance_amount = rows.reduce((sum: number, r: any) => sum + Number(r.advance_amount || 0), 0);
        const total_expenditure = rows.reduce((sum: number, r: any) => sum + Number(r.total_expenditure || 0), 0);
        
        return {
          date: periodName,
          labours_present,
          labour_cost,
          ot_cost,
          contractor_cost,
          advance_amount,
          total_expenditure,
          isGrouped: true
        };
      }).filter(p => p.total_expenditure > 0 || p.labours_present > 0);
    }
    
    if (reportInterval === 'monthly') {
      const monthsMap: { [key: string]: any[] } = {};
      
      list.forEach((row: any) => {
        const dateObj = new Date(row.date);
        const monthKey = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!monthsMap[monthKey]) {
          monthsMap[monthKey] = [];
        }
        monthsMap[monthKey].push(row);
      });
      
      return Object.keys(monthsMap).map(monthName => {
        const rows = monthsMap[monthName];
        const labours_present = rows.reduce((sum: number, r: any) => sum + Number(r.labours_present || 0), 0);
        const labour_cost = rows.reduce((sum: number, r: any) => sum + Number(r.labour_cost || 0), 0);
        const ot_cost = rows.reduce((sum: number, r: any) => sum + Number(r.ot_cost || 0), 0);
        const contractor_cost = rows.reduce((sum: number, r: any) => sum + Number(r.contractor_cost || 0), 0);
        const advance_amount = rows.reduce((sum: number, r: any) => sum + Number(r.advance_amount || 0), 0);
        const total_expenditure = rows.reduce((sum: number, r: any) => sum + Number(r.total_expenditure || 0), 0);
        
        return {
          date: monthName,
          labours_present,
          labour_cost,
          ot_cost,
          contractor_cost,
          advance_amount,
          total_expenditure,
          isGrouped: true
        };
      }).filter(m => m.total_expenditure > 0 || m.labours_present > 0);
    }
    
    if (reportInterval === 'yearly') {
      const yearsMap: { [key: string]: any[] } = {};
      
      list.forEach((row: any) => {
        const dateObj = new Date(row.date);
        const yearKey = `Year ${dateObj.getFullYear()}`;
        if (!yearsMap[yearKey]) {
          yearsMap[yearKey] = [];
        }
        yearsMap[yearKey].push(row);
      });
      
      return Object.keys(yearsMap).map(yearName => {
        const rows = yearsMap[yearName];
        const labours_present = rows.reduce((sum: number, r: any) => sum + Number(r.labours_present || 0), 0);
        const labour_cost = rows.reduce((sum: number, r: any) => sum + Number(r.labour_cost || 0), 0);
        const ot_cost = rows.reduce((sum: number, r: any) => sum + Number(r.ot_cost || 0), 0);
        const contractor_cost = rows.reduce((sum: number, r: any) => sum + Number(r.contractor_cost || 0), 0);
        const advance_amount = rows.reduce((sum: number, r: any) => sum + Number(r.advance_amount || 0), 0);
        const total_expenditure = rows.reduce((sum: number, r: any) => sum + Number(r.total_expenditure || 0), 0);
        
        return {
          date: yearName,
          labours_present,
          labour_cost,
          ot_cost,
          contractor_cost,
          advance_amount,
          total_expenditure,
          isGrouped: true
        };
      }).filter(y => y.total_expenditure > 0 || y.labours_present > 0);
    }
    
    return list;
  };

  const getGroupedLabourDetails = () => {
    const list = labourDetails || [];
    if (reportInterval === 'daily') {
      return list;
    }
    
    if (reportInterval === 'weekly') {
      const weeks: { [key: string]: any[] } = {};
      
      list.forEach((log: any) => {
        const dateObj = new Date(log.attendance_date);
        const day = dateObj.getDay();
        const sunday = new Date(dateObj);
        sunday.setDate(dateObj.getDate() - day);
        const sundayStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        const saturdayStr = saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const weekKey = `${sundayStr} - ${saturdayStr}`;
        if (!weeks[weekKey]) {
          weeks[weekKey] = [];
        }
        weeks[weekKey].push(log);
      });
      
      return Object.keys(weeks).map(weekName => {
        const logs = weeks[weekName];
        const presents = logs.filter(l => l.status === 'Present').length;
        const halfDays = logs.filter(l => l.status === 'Half Day').length;
        const absents = logs.filter(l => l.status === 'Absent').length;
        const totalOtHours = logs.reduce((sum, l) => sum + Number(l.ot_hours || 0), 0);
        const totalOtAmount = logs.reduce((sum, l) => sum + (Number(l.ot_hours || 0) * Number(l.ot_rate || 0)), 0);
        const totalAdvance = logs.reduce((sum, l) => sum + Number(l.advance_amount || 0), 0);
        
        return {
          id: weekName,
          attendance_date: weekName,
          status: `Present: ${presents}, Half: ${halfDays}, Absent: ${absents}`,
          check_in_out: `Worked: ${(presents + 0.5 * halfDays).toFixed(1)} days`,
          ot_hours: totalOtHours,
          ot_amount: totalOtAmount,
          advance_amount: totalAdvance,
          isGrouped: true
        };
      }).filter(w => w.advance_amount > 0 || w.ot_hours > 0 || w.status !== 'Present: 0, Half: 0, Absent: 0');
    }
    
    if (reportInterval === '15_days') {
      const periods: { [key: string]: any[] } = {};
      
      list.forEach((log: any) => {
        const dateObj = new Date(log.attendance_date);
        const day = dateObj.getDate();
        const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        const periodKey = day <= 15 ? `${monthName} (1st - 15th)` : `${monthName} (16th - End)`;
        if (!periods[periodKey]) {
          periods[periodKey] = [];
        }
        periods[periodKey].push(log);
      });
      
      return Object.keys(periods).map(periodName => {
        const logs = periods[periodName];
        const presents = logs.filter(l => l.status === 'Present').length;
        const halfDays = logs.filter(l => l.status === 'Half Day').length;
        const absents = logs.filter(l => l.status === 'Absent').length;
        const totalOtHours = logs.reduce((sum, l) => sum + Number(l.ot_hours || 0), 0);
        const totalOtAmount = logs.reduce((sum, l) => sum + (Number(l.ot_hours || 0) * Number(l.ot_rate || 0)), 0);
        const totalAdvance = logs.reduce((sum, l) => sum + Number(l.advance_amount || 0), 0);
        
        return {
          id: periodName,
          attendance_date: periodName,
          status: `Present: ${presents}, Half: ${halfDays}, Absent: ${absents}`,
          check_in_out: `Worked: ${(presents + 0.5 * halfDays).toFixed(1)} days`,
          ot_hours: totalOtHours,
          ot_amount: totalOtAmount,
          advance_amount: totalAdvance,
          isGrouped: true
        };
      }).filter(p => p.advance_amount > 0 || p.ot_hours > 0 || p.status !== 'Present: 0, Half: 0, Absent: 0');
    }
    
    if (reportInterval === 'monthly') {
      const monthsMap: { [key: string]: any[] } = {};
      
      list.forEach((log: any) => {
        const dateObj = new Date(log.attendance_date);
        const monthKey = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!monthsMap[monthKey]) {
          monthsMap[monthKey] = [];
        }
        monthsMap[monthKey].push(log);
      });
      
      return Object.keys(monthsMap).map(monthName => {
        const logs = monthsMap[monthName];
        const presents = logs.filter(l => l.status === 'Present').length;
        const halfDays = logs.filter(l => l.status === 'Half Day').length;
        const absents = logs.filter(l => l.status === 'Absent').length;
        const totalOtHours = logs.reduce((sum, l) => sum + Number(l.ot_hours || 0), 0);
        const totalOtAmount = logs.reduce((sum, l) => sum + (Number(l.ot_hours || 0) * Number(l.ot_rate || 0)), 0);
        const totalAdvance = logs.reduce((sum, l) => sum + Number(l.advance_amount || 0), 0);
        
        return {
          id: monthName,
          attendance_date: monthName,
          status: `Present: ${presents}, Half: ${halfDays}, Absent: ${absents}`,
          check_in_out: `Worked: ${(presents + 0.5 * halfDays).toFixed(1)} days`,
          ot_hours: totalOtHours,
          ot_amount: totalOtAmount,
          advance_amount: totalAdvance,
          isGrouped: true
        };
      }).filter(m => m.advance_amount > 0 || m.ot_hours > 0 || m.status !== 'Present: 0, Half: 0, Absent: 0');
    }
    
    if (reportInterval === 'yearly') {
      const yearsMap: { [key: string]: any[] } = {};
      
      list.forEach((log: any) => {
        const dateObj = new Date(log.attendance_date);
        const yearKey = `Year ${dateObj.getFullYear()}`;
        if (!yearsMap[yearKey]) {
          yearsMap[yearKey] = [];
        }
        yearsMap[yearKey].push(log);
      });
      
      return Object.keys(yearsMap).map(yearName => {
        const logs = yearsMap[yearName];
        const presents = logs.filter(l => l.status === 'Present').length;
        const halfDays = logs.filter(l => l.status === 'Half Day').length;
        const absents = logs.filter(l => l.status === 'Absent').length;
        const totalOtHours = logs.reduce((sum, l) => sum + Number(l.ot_hours || 0), 0);
        const totalOtAmount = logs.reduce((sum, l) => sum + (Number(l.ot_hours || 0) * Number(l.ot_rate || 0)), 0);
        const totalAdvance = logs.reduce((sum, l) => sum + Number(l.advance_amount || 0), 0);
        
        return {
          id: yearName,
          attendance_date: yearName,
          status: `Present: ${presents}, Half: ${halfDays}, Absent: ${absents}`,
          check_in_out: `Worked: ${(presents + 0.5 * halfDays).toFixed(1)} days`,
          ot_hours: totalOtHours,
          ot_amount: totalOtAmount,
          advance_amount: totalAdvance,
          isGrouped: true
        };
      }).filter(y => y.advance_amount > 0 || y.ot_hours > 0 || y.status !== 'Present: 0, Half: 0, Absent: 0');
    }
    
    return list;
  };

  const getFormattedDateString = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          {/* Segmented Tab Control */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200/50 shrink-0">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'daily' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Expenditure
            </button>
            <button
              onClick={() => setActiveTab('labour')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'labour' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Labour
            </button>
            <button
              onClick={() => setActiveTab('contractor')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'contractor' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Contractor
            </button>
          </div>

          {/* Controls Cluster */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-gray-400">View:</span>
              <select
                value={reportInterval}
                onChange={(e: any) => setReportInterval(e.target.value)}
                className="border border-gray-200 rounded-lg text-xs font-semibold py-1.5 px-3 bg-white text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="daily">Daily View</option>
                <option value="weekly">Weekly View</option>
                <option value="15_days">15 Days View</option>
                <option value="monthly">Monthly View</option>
                <option value="yearly">Yearly View</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-400">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-gray-200 rounded-lg text-xs font-medium py-1 px-1.5 bg-white text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-400">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-gray-200 rounded-lg text-xs font-medium py-1 px-1.5 bg-white text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* QR Scan Button */}
            <button
              onClick={() => setIsScanningQR(true)}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition border border-indigo-200 shadow-sm flex items-center justify-center shrink-0"
              title="Scan QR Code"
            >
              <QrCode size={18} />
            </button>

            <button 
              onClick={() => handleExportPDF(activeTab === 'labour' ? 'monthly' : activeTab === 'contractor' ? 'contractor' : 'daily')} 
              className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm shrink-0"
              title="Export to PDF"
            >
              <Download size={18} />
            </button>

            <button 
              onClick={() => handleSharePDF(activeTab === 'labour' ? 'monthly' : activeTab === 'contractor' ? 'contractor' : 'daily')} 
              className="p-1.5 bg-indigo-600 border border-indigo-600 rounded-lg text-white hover:bg-indigo-700 shadow-sm shrink-0"
              title="Share Report"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : (activeTab === 'labour' && report.length === 0) || (activeTab === 'contractor' && contractorReport.length === 0) || (activeTab === 'daily' && dailyReport.length === 0) ? (
        <div className="bg-white text-center py-12 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 mb-4">No data available for this range</p>
        </div>
      ) : activeTab === 'daily' ? (
        <div id="daily-report-table" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-center">Labours Present</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Labour Cost</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Contractor Cost</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Advances</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Total Expense</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {getGroupedDailyReport().map((row: any) => {
                  const labourCost = Number(row.labour_cost || 0) + Number(row.ot_cost || 0);
                  const totalExpense = Number(row.total_expenditure || 0);
                  
                  // Highlight non-zero days/weeks
                  const isNonZero = totalExpense > 0;
                  
                  return (
                    <tr key={row.date} className={`transition-colors ${isNonZero ? 'hover:bg-indigo-50' : 'opacity-60'}`}>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-900">
                          {row.isGrouped ? row.date : new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        {row.labours_present > 0 ? <span className="text-indigo-600">{row.labours_present}</span> : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {labourCost > 0 ? <span className="text-gray-900">₹{labourCost.toFixed(0)}</span> : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Number(row.contractor_cost) > 0 ? <span className="text-blue-600">₹{Number(row.contractor_cost).toFixed(0)}</span> : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Number(row.advance_amount) > 0 ? <span className="text-orange-600">₹{Number(row.advance_amount).toFixed(0)}</span> : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {totalExpense > 0 ? <span className="text-gray-900">₹{totalExpense.toFixed(0)}</span> : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={2} className="py-4 px-4 font-bold text-gray-900 text-right">Totals:</td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">
                    ₹{dailyReport.reduce((sum, r: any) => sum + Number(r.labour_cost || 0) + Number(r.ot_cost || 0), 0).toFixed(0)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-blue-600">
                    ₹{dailyReport.reduce((sum, r: any) => sum + Number(r.contractor_cost || 0), 0).toFixed(0)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-orange-600">
                    ₹{dailyReport.reduce((sum, r: any) => sum + Number(r.advance_amount || 0), 0).toFixed(0)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900 text-lg">
                    ₹{dailyReport.reduce((sum, r: any) => sum + Number(r.total_expenditure || 0), 0).toFixed(0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : activeTab === 'labour' ? (
        <div id="monthly-report-table" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Labour Name</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-center">Attendance (P/A/H)</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">OT Hrs</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">OT Amt</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Advances</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.map((row: any) => {
                  const regularSalary = (Number(row.total_present) + Number(row.total_half_day)*0.5) * Number(row.daily_wage || 0);
                  const otAmt = Number(row.total_ot_amount || 0);
                  const advances = Number(row.total_advance_amount || 0);
                  const netSalary = regularSalary + otAmt - advances;

                  return (
                    <tr 
                      key={row.labour_id} 
                      onClick={() => handleRowClick(row)}
                      className="hover:bg-indigo-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{row.full_name}</p>
                        <p className="text-xs text-gray-500">{row.contractor_name || 'Direct'} • Wage: ₹{row.daily_wage || 0}/day</p>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        <span className="text-green-600" title="Present">{row.total_present}</span> / <span className="text-red-600" title="Absent">{row.total_absent}</span> / <span className="text-yellow-600" title="Half Day">{row.total_half_day}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-indigo-600">{Number(row.total_ot_hours || 0).toFixed(1)}</td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">₹{otAmt.toFixed(0)}</td>
                      <td className="py-3 px-4 text-right font-medium text-orange-600">₹{advances.toFixed(0)}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">₹{netSalary.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div id="contractor-report-table" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Contractor</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-center">Labours Provided</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Worked Units</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Unit Price</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Total Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contractorReport.map((row: any) => {
                  const payable = Number(row.total_worked_units || 0) * Number(row.unit_price || 0);
                  return (
                    <tr key={`${row.contractor_id}_${row.unit}_${row.unit_price}`} onClick={() => handleContractorRowClick(row)} className="hover:bg-indigo-50 transition-colors cursor-pointer">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-500">{row.company_name || 'Individual'} • {row.contract_type}</p>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-indigo-600">
                        {row.total_labours_provided || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-blue-600">
                        {row.total_worked_units || 0} {row.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 text-sm">
                        ₹{Number(row.unit_price || 0).toFixed(0)}/{row.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        ₹{payable.toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for detailed logs */}
      {selectedLabour && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div id="labour-detailed-report" className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl" data-html2canvas-ignore>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{selectedLabour.full_name}</h3>
                <p className="text-sm text-gray-500">
                  {getFormattedDateString(fromDate)} - {getFormattedDateString(toDate)} • 
                  Wage: ₹{selectedLabour.daily_wage || 0}/day
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExportPDF('labour')} className="p-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50" title="Export to PDF"><Download size={16} /></button>
                <button onClick={() => handleSharePDF('labour')} className="p-2 bg-indigo-600 border border-indigo-600 rounded-lg text-white hover:bg-indigo-700" title="Share Report"><Share2 size={16} /></button>
                <button onClick={() => setSelectedLabour(null)} className="p-2 text-gray-400 hover:text-gray-600 border border-transparent rounded-lg hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            <div className="p-4 border-b hidden" id="pdf-only-header">
               <h3 className="font-bold text-xl text-gray-900">{selectedLabour.full_name}</h3>
               <p className="text-md text-gray-600">
                  Attendance Report: {getFormattedDateString(fromDate)} - {getFormattedDateString(toDate)}
               </p>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {loadingDetails ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
              ) : labourDetails.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No daily records found for this range.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                      <th className="py-2 px-3 font-semibold rounded-tl-lg">Date</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                      <th className="py-2 px-3 font-semibold">In / Out</th>
                      <th className="py-2 px-3 font-semibold text-right">OT</th>
                      <th className="py-2 px-3 font-semibold text-right">Advance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {labourDetails.map((log: any) => (
                      <tr key={log.id} className="text-sm">
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {new Date(log.attendance_date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.status === 'Present' ? 'bg-green-100 text-green-700' : log.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {log.status === 'Present' || log.status === 'Half Day' ? `${log.check_in || '--:--'} - ${log.check_out || '--:--'}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {Number(log.ot_hours) > 0 ? (
                            <div>
                              <span className="text-indigo-600 font-medium">{Number(log.ot_hours).toFixed(1)}h</span>
                              <span className="text-xs text-gray-400 block">@ ₹{log.ot_rate}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {Number(log.advance_amount) > 0 ? (
                            <div>
                              <span className="text-orange-600 font-medium">₹{Number(log.advance_amount).toFixed(0)}</span>
                              <span className="text-xs text-gray-400 block">{log.advance_mode}</span>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
              <div className="text-sm">
                <span className="text-gray-500">Net Payable: </span>
                <span className="font-bold text-gray-900">
                  ₹{((Number(selectedLabour.total_present) + Number(selectedLabour.total_half_day)*0.5) * Number(selectedLabour.daily_wage || 0) + Number(selectedLabour.total_ot_amount || 0) - Number(selectedLabour.total_advance_amount || 0)).toFixed(0)}
                </span>
              </div>
              <button onClick={() => setSelectedLabour(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50" data-html2canvas-ignore>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for detailed contractor logs */}
      {selectedContractor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-0 md:p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full h-[100dvh] md:h-auto md:max-w-3xl md:max-h-[90vh] flex flex-col overflow-hidden rounded-none md:rounded-xl shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-none md:rounded-t-xl shrink-0">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{selectedContractor.name}</h3>
                <p className="text-sm text-gray-500">
                  {getFormattedDateString(fromDate)} - {getFormattedDateString(toDate)} • 
                  Unit Price: ₹{selectedContractor.unit_price || 0}/{selectedContractor.unit}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExportPDF('contractor_detail')} className="p-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50" title="Export to PDF"><Download size={16} /></button>
                <button onClick={() => handleSharePDF('contractor_detail')} className="p-2 bg-indigo-600 border border-indigo-600 rounded-lg text-white hover:bg-indigo-700" title="Share Report"><Share2 size={16} /></button>
                <button onClick={() => setSelectedContractor(null)} className="p-2 text-gray-400 hover:text-gray-600 border border-transparent rounded-lg hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {loadingDetails ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
              ) : contractorDetails.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No daily records found for this range.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                      <th className="py-2 px-3 font-semibold rounded-tl-lg">Date</th>
                      <th className="py-2 px-3 font-semibold text-center">Labours</th>
                      <th className="py-2 px-3 font-semibold text-right">Worked Units</th>
                      <th className="py-2 px-3 font-semibold text-right rounded-tr-lg">Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contractorDetails.map((log: any) => {
                      const payable = Number(log.worked_units || 0) * Number(selectedContractor.unit_price || 0);
                      return (
                        <tr key={log.id} className="text-sm">
                          <td className="py-2 px-3 font-medium text-gray-900">{new Date(log.attendance_date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-center text-indigo-600">{log.num_of_labours || '-'}</td>
                          <td className="py-2 px-3 text-right text-blue-600">
                            <div className="flex items-center justify-end gap-1.5 font-mono">
                              <span>{log.worked_units || '0'} {selectedContractor.unit}</span>
                              {log.work_details && (
                                <button
                                  onClick={() => openViewMeasurementSheet(log)}
                                  className="p-1 rounded text-green-600 hover:bg-green-50 transition border border-green-200 bg-green-50/50"
                                  title="View Measurement Sheet"
                                >
                                  <FileSpreadsheet size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-gray-900 font-mono">₹{payable.toFixed(0)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 rounded-none md:rounded-b-xl flex justify-between items-center shrink-0">
              <div className="text-sm">
                <span className="text-gray-500">Net Payable: </span>
                <span className="font-bold text-gray-900">
                  ₹{(Number(selectedContractor.total_worked_units || 0) * Number(selectedContractor.unit_price || 0)).toFixed(0)}
                </span>
              </div>
              <button onClick={() => setSelectedContractor(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
      {showMeasurementModal && activeLogForModal && selectedContractor && (
        <SteelMeasurementModal 
          contractor={{
            name: selectedContractor.name,
            company_name: selectedContractor.company_name,
            unit_price: activeLogForModal.unit_price || selectedContractor.unit_price,
            unit: activeLogForModal.unit || selectedContractor.unit,
            work_details: activeLogForModal.work_details
          }}
          date={activeLogForModal.attendance_date}
          onClose={() => {
            setShowMeasurementModal(false);
            setActiveLogForModal(null);
          }}
          readOnly={true}
        />
      )}

      {isScanningQR && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md relative flex flex-col items-center">
            <button 
              onClick={() => setIsScanningQR(false)}
              className="absolute -top-12 right-0 text-white p-2 flex items-center bg-white/10 rounded-full hover:bg-white/20 transition-all"
            >
              <X size={24} />
            </button>
            
            <div className="w-full overflow-hidden rounded-2xl border-4 border-indigo-500/40 bg-gray-900 shadow-2xl">
              <Scanner 
                onScan={handleQRScan}
                components={{ audio: true, finder: true } as any}
              />
              <div className="p-4 text-center text-white/80 bg-gray-900 border-t border-gray-800">
                <p className="text-sm font-semibold">Position Labour QR code within the scanner frame</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
