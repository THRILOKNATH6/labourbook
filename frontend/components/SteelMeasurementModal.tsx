import { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Trash2, Copy, Download, RefreshCw, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface SteelMeasurementModalProps {
  contractor: any;
  date: string;
  onClose: () => void;
  onSave?: (workedUnits: number, workDetails: any) => void;
  readOnly?: boolean;
}

// Helper to convert units to meters for weight calculation
const getLengthInMeters = (length: number, unit: string) => {
  const l = parseFloat(length.toString()) || 0;
  switch (unit) {
    case 'cm': return l / 100;
    case 'ft': return l * 0.3048;
    case 'in': return l * 0.0254;
    case 'm':
    default:
      return l;
  }
};

export default function SteelMeasurementModal({
  contractor,
  date,
  onClose,
  onSave,
  readOnly = false
}: SteelMeasurementModalProps) {
  const [title, setTitle] = useState('PLACING OF TORE STEEL');
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const workDetails = contractor.work_details;
    if (workDetails) {
      try {
        const details = typeof workDetails === 'string' ? JSON.parse(workDetails) : workDetails;
        setTitle(details.title || 'PLACING OF TORE STEEL');
        setRows(details.rows || []);
      } catch (e) {
        resetToDefault();
      }
    } else {
      resetToDefault();
    }
  }, [contractor]);

  const resetToDefault = () => {
    setTitle('PLACING OF TORE STEEL');
    setRows([
      { description: 'RAMP SOUTH NORTH', nos: 2, no_of_bars: 26, length: 6, length_unit: 'm', size: '12 mm', coeff: 0.888 }
    ]);
  };

  const handleAddRow = () => {
    if (readOnly) return;
    setRows([...rows, { description: '', nos: 1, no_of_bars: 1, length: 1, length_unit: 'm', size: '12 mm', coeff: 0.888 }]);
  };

  const handleDuplicateRow = (index: number) => {
    if (readOnly) return;
    const rowToDuplicate = rows[index];
    const newRows = [...rows];
    newRows.splice(index + 1, 0, { ...rowToDuplicate, length_unit: rowToDuplicate.length_unit || 'm' });
    setRows(newRows);
  };

  const handleDeleteRow = (index: number) => {
    if (readOnly) return;
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows.length > 0 ? newRows : [{ description: '', nos: 1, no_of_bars: 1, length: 1, length_unit: 'm', size: '12 mm', coeff: 0.888 }]);
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    if (readOnly) return;
    const newRows = [...rows];
    newRows[index][field] = value;

    if (field === 'size') {
      const selectedSize = value;
      if (selectedSize === '6 mm') newRows[index].coeff = 0.222;
      else if (selectedSize === '8 mm') newRows[index].coeff = 0.396;
      else if (selectedSize === '10 mm') newRows[index].coeff = 0.617;
      else if (selectedSize === '12 mm') newRows[index].coeff = 0.888;
      else if (selectedSize === '16 mm') newRows[index].coeff = 1.578;
      else if (selectedSize === '20 mm') newRows[index].coeff = 2.466;
      else if (selectedSize === '25 mm') newRows[index].coeff = 3.853;
      else if (selectedSize === '32 mm') newRows[index].coeff = 6.313;
    }

    setRows(newRows);
  };

  const rowWeights = rows.map(row => {
    const nos = parseFloat(row.nos) || 0;
    const noOfBars = parseFloat(row.no_of_bars) || 0;
    const lenMeters = getLengthInMeters(row.length || 0, row.length_unit || 'm');
    const coeff = parseFloat(row.coeff) || 0;
    return nos * noOfBars * lenMeters * coeff;
  });

  const totalRawWeight = rowWeights.reduce((sum, w) => sum + w, 0);
  const grandTotalRawWeight = totalRawWeight;

  const handleApply = () => {
    if (!onSave) return;
    
    let finalUnits = grandTotalRawWeight;
    const unitName = (contractor.unit || '').toLowerCase();
    const isTon = unitName.includes('ton') || unitName === 'mt';
    
    if (isTon) {
      finalUnits = grandTotalRawWeight / 1000;
    }

    const savedRows = rows.map((r, i) => ({
      ...r,
      weight: parseFloat(rowWeights[i].toFixed(2))
    }));

    onSave(parseFloat(finalUnits.toFixed(2)), {
      title,
      rows: savedRows,
      total_weight: parseFloat(totalRawWeight.toFixed(2)),
      grand_total_weight: parseFloat(grandTotalRawWeight.toFixed(2))
    });
  };

  const handleExportPDF = () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.setFontSize(16);
      pdf.setTextColor(31, 41, 55);
      pdf.text(`Steel Measurement Sheet`, 14, 18);
      
      pdf.setFontSize(11);
      pdf.setTextColor(79, 70, 229);
      pdf.text(`Contractor: ${contractor.name || contractor.contractor_name || ''} ${contractor.company_name ? `(${contractor.company_name})` : ''}`, 14, 25);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Date: ${new Date(date).toLocaleDateString()}   |   Title: ${title}`, 14, 31);

      const tableData = rows.map((row, i) => [
        (i + 1).toString(),
        row.description || '-',
        parseFloat(row.nos).toFixed(2),
        parseFloat(row.no_of_bars).toFixed(0),
        `${parseFloat(row.length).toFixed(2)} ${row.length_unit || 'm'}`,
        row.size || 'Custom',
        parseFloat(row.coeff).toFixed(3),
        rowWeights[i].toFixed(2)
      ]);

      autoTable(pdf, {
        startY: 37,
        head: [['#', 'Description', "No's", 'No of Bars', 'Length', 'Size', 'Co-eff', 'Weight (kg)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 50 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });

      const finalY = (pdf as any).lastAutoTable.finalY || 37;
      
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(`Grand Total Weight: ${grandTotalRawWeight.toFixed(2)} kg`, 14, finalY + 10);

      const unitName = (contractor.unit || '').toLowerCase();
      const isTon = unitName.includes('ton') || unitName === 'mt';
      if (isTon) {
        pdf.text(`Worked Units Applied: ${(grandTotalRawWeight / 1000).toFixed(2)} ${contractor.unit}`, 14, finalY + 16);
      }

      pdf.save(`Measurement_Sheet_${contractor.name || contractor.contractor_name || 'Contractor'}_${date}.pdf`);
      toast.success('Measurement sheet PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-50 overflow-y-auto">
      <div className="bg-white w-full h-[100dvh] md:h-auto md:max-w-5xl md:max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 rounded-none md:rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
          <div>
            <h3 className="font-bold text-base md:text-lg text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600" size={18} />
              <span>Steel Measurement Sheet</span>
              {readOnly && (
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full uppercase">
                  Read-Only
                </span>
              )}
            </h3>
            <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
              Contractor: <span className="font-semibold text-gray-700">{contractor.name || contractor.contractor_name}</span> {contractor.company_name ? `(${contractor.company_name})` : ''} 
              <span className="mx-1 md:mx-2">•</span> Rate: <span className="font-semibold text-gray-700">₹{contractor.unit_price}/{contractor.unit || 'Unit'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        {/* Form controls (Section Title, Reset Template, PDF Download) */}
        <div className="px-4 py-2.5 md:px-6 md:py-3.5 border-b border-gray-100 flex flex-row items-center gap-2 bg-white shrink-0">
          <div className="flex-1 min-w-0">
            <input 
              type="text"
              value={title}
              disabled={readOnly}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Section/Task Title"
              title="Section/Task Title"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs md:text-sm font-semibold disabled:bg-gray-50"
            />
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {!readOnly && (
              <button 
                onClick={resetToDefault}
                className="p-2 md:px-3.5 md:py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold transition flex items-center gap-1"
                title="Reset Template"
              >
                <RefreshCw size={13} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            
            <button 
              onClick={handleExportPDF}
              className="p-2 md:px-3.5 md:py-1.5 border border-gray-300 text-gray-700 bg-white font-bold rounded-lg hover:bg-gray-50 transition text-xs flex items-center gap-1"
              title="Download PDF Report"
            >
              <Download size={13} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Shifting Grand Total block to Top Side (just below form controls) */}
        <div className="mx-4 md:mx-6 my-3 bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-800 shrink-0 shadow-md">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Grand Total Weight</span>
            <span className="text-xl md:text-2xl font-black text-indigo-300 tracking-tight font-mono">
              {grandTotalRawWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
            </span>
          </div>

          <div className="flex flex-col sm:items-end w-full sm:w-auto border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Applying to Work Done</span>
            <span className="text-lg md:text-xl font-bold text-green-400 font-mono">
              {(() => {
                const unitName = (contractor.unit || '').toLowerCase();
                const isTon = unitName.includes('ton') || unitName === 'mt';
                if (isTon) {
                  return `${(grandTotalRawWeight / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${contractor.unit || 'Tons'}`;
                }
                return `${grandTotalRawWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${contractor.unit || 'kg'}`;
              })()}
            </span>
            {(() => {
              const unitName = (contractor.unit || '').toLowerCase();
              const isTon = unitName.includes('ton') || unitName === 'mt';
              if (isTon) {
                return <span className="text-[9px] text-slate-400 mt-0.5">(Divided by 1000 to match {contractor.unit || 'Tons'} rate)</span>;
              }
              return null;
            })()}
          </div>
        </div>

        {/* Scrollable Table / Cards Area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 md:px-6 md:py-4 bg-gray-50">
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Description</th>
                  <th className="py-2.5 px-3 w-20 text-right">No's</th>
                  <th className="py-2.5 px-3 w-20 text-right">No of Bars</th>
                  <th className="py-2.5 px-3 w-36 text-center">Length</th>
                  <th className="py-2.5 px-3 w-36">Size</th>
                  <th className="py-2.5 px-3 w-24 text-right">Co-eff</th>
                  <th className="py-2.5 px-3 w-28 text-right">Weight (kg)</th>
                  {!readOnly && <th className="py-2.5 px-3 w-24 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-center text-xs font-semibold text-gray-400">{i + 1}</td>
                    <td className="py-2 px-3">
                      <input 
                        type="text"
                        value={row.description || ''}
                        disabled={readOnly}
                        onChange={(e) => handleRowChange(i, 'description', e.target.value)}
                        placeholder="e.g. COLUMN BAR"
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none font-medium disabled:bg-transparent disabled:border-transparent disabled:px-0"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input 
                        type="number"
                        step="0.01"
                        value={row.nos ?? ''}
                        disabled={readOnly}
                        onChange={(e) => handleRowChange(i, 'nos', parseFloat(e.target.value) || 0)}
                        placeholder="1.0"
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-right focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:px-0 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input 
                        type="number"
                        step="1"
                        value={row.no_of_bars ?? ''}
                        disabled={readOnly}
                        onChange={(e) => handleRowChange(i, 'no_of_bars', parseInt(e.target.value) || 0)}
                        placeholder="1"
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-right focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:px-0 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 justify-end">
                        <input 
                          type="number"
                          step="0.01"
                          value={row.length ?? ''}
                          disabled={readOnly}
                          onChange={(e) => handleRowChange(i, 'length', parseFloat(e.target.value) || 0)}
                          placeholder="1.0"
                          className="w-16 px-1.5 py-1 text-sm border border-gray-200 rounded text-right focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:px-0 font-mono"
                        />
                        {readOnly ? (
                          <span className="text-xs text-gray-500 font-mono pr-1">{row.length_unit || 'm'}</span>
                        ) : (
                          <select
                            value={row.length_unit || 'm'}
                            onChange={(e) => handleRowChange(i, 'length_unit', e.target.value)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded px-1 py-1 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                          >
                            <option value="m">m</option>
                            <option value="cm">cm</option>
                            <option value="ft">ft</option>
                            <option value="in">in</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {readOnly ? (
                        <span className="text-sm text-gray-700">{row.size || 'Custom'}</span>
                      ) : (
                        <select
                          value={row.size || 'Custom'}
                          onChange={(e) => handleRowChange(i, 'size', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          <option value="6 mm">6 mm (0.222)</option>
                          <option value="8 mm">8 mm (0.396)</option>
                          <option value="10 mm">10 mm (0.617)</option>
                          <option value="12 mm">12 mm (0.888)</option>
                          <option value="16 mm">16 mm (1.578)</option>
                          <option value="20 mm">20 mm (2.466)</option>
                          <option value="25 mm">25 mm (3.853)</option>
                          <option value="32 mm">32 mm (6.313)</option>
                          <option value="Custom">Custom...</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <input 
                        type="number"
                        step="0.001"
                        value={row.coeff ?? ''}
                        disabled={readOnly || row.size !== 'Custom'}
                        onChange={(e) => handleRowChange(i, 'coeff', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-right disabled:bg-transparent disabled:border-transparent disabled:px-0 font-semibold text-gray-700 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-gray-900 bg-gray-50 font-mono">
                      {rowWeights[i].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {!readOnly && (
                      <td className="py-2 px-3">
                        <div className="flex gap-1 justify-center">
                          <button 
                            onClick={() => handleDuplicateRow(i)}
                            className="p-1 hover:bg-indigo-50 hover:text-indigo-600 rounded text-gray-400 transition"
                            title="Duplicate Row"
                          >
                            <Copy size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRow(i)}
                            className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition"
                            title="Delete Row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Responsive Mobile Cards View (Shown only on small screens) */}
          <div className="space-y-4 md:hidden">
            {rows.map((row, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative space-y-3">
                {/* Card Title & Delete/Duplicate Action row */}
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    Row #{i + 1}
                  </span>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDuplicateRow(i)}
                        className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-gray-500 border border-gray-200 bg-gray-50/50 transition"
                        title="Duplicate Row"
                      >
                        <Copy size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteRow(i)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-500 border border-gray-200 bg-gray-50/50 transition"
                        title="Delete Row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description Input */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Description</label>
                  <input 
                    type="text"
                    value={row.description || ''}
                    disabled={readOnly}
                    onChange={(e) => handleRowChange(i, 'description', e.target.value)}
                    placeholder="e.g. COLUMN BAR"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium disabled:bg-transparent disabled:border-transparent disabled:px-0"
                  />
                </div>

                {/* Numeric fields in a responsive grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1">No's</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={row.nos ?? ''}
                      disabled={readOnly}
                      onChange={(e) => handleRowChange(i, 'nos', parseFloat(e.target.value) || 0)}
                      placeholder="1.0"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:px-0 font-mono"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1">No of Bars</label>
                    <input 
                      type="number"
                      step="1"
                      value={row.no_of_bars ?? ''}
                      disabled={readOnly}
                      onChange={(e) => handleRowChange(i, 'no_of_bars', parseInt(e.target.value) || 0)}
                      placeholder="1"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:px-0 font-mono"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Length</label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number"
                        step="0.01"
                        value={row.length ?? ''}
                        disabled={readOnly}
                        onChange={(e) => handleRowChange(i, 'length', parseFloat(e.target.value) || 0)}
                        placeholder="1.0"
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:px-0 font-mono text-left"
                      />
                      {readOnly ? (
                        <span className="text-xs text-gray-500 font-mono pr-2">{row.length_unit || 'm'}</span>
                      ) : (
                        <select
                          value={row.length_unit || 'm'}
                          onChange={(e) => handleRowChange(i, 'length_unit', e.target.value)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        >
                          <option value="m">m</option>
                          <option value="cm">cm</option>
                          <option value="ft">ft</option>
                          <option value="in">in</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Size</label>
                    {readOnly ? (
                      <span className="text-sm font-semibold text-gray-700 py-1.5">{row.size || 'Custom'}</span>
                    ) : (
                      <select
                        value={row.size || 'Custom'}
                        onChange={(e) => handleRowChange(i, 'size', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="6 mm">6 mm (0.222)</option>
                        <option value="8 mm">8 mm (0.396)</option>
                        <option value="10 mm">10 mm (0.617)</option>
                        <option value="12 mm">12 mm (0.888)</option>
                        <option value="16 mm">16 mm (1.578)</option>
                        <option value="20 mm">20 mm (2.466)</option>
                        <option value="25 mm">25 mm (3.853)</option>
                        <option value="32 mm">32 mm (6.313)</option>
                        <option value="Custom">Custom...</option>
                      </select>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Co-eff</label>
                    <input 
                      type="number"
                      step="0.001"
                      value={row.coeff ?? ''}
                      disabled={readOnly || row.size !== 'Custom'}
                      onChange={(e) => handleRowChange(i, 'coeff', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:px-0 font-semibold text-gray-700 font-mono"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Weight (kg)</label>
                    <div className="px-3 py-1.5 text-sm bg-gray-50 font-bold text-gray-900 border border-gray-100 rounded-lg font-mono">
                      {rowWeights[i].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!readOnly && (
            <div className="mt-3">
              <button 
                onClick={handleAddRow}
                className="px-4 py-2.5 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 text-sm font-semibold hover:border-indigo-500 hover:bg-indigo-50 transition duration-200 flex items-center gap-1.5 w-full justify-center"
              >
                <Plus size={16} />
                Add Row
              </button>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-t border-gray-200 flex justify-end items-center gap-2 bg-gray-50 shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition text-sm"
          >
            Close
          </button>
          {!readOnly && (
            <button 
              onClick={handleApply}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition text-sm shadow-md shadow-indigo-100"
            >
              Apply & Save
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
