
import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, RotateCcw, X, Printer, FileText, Download, MoreVertical, ZoomIn, ZoomOut, Maximize, Minimize, AlertCircle } from 'lucide-react';
import BillTemplate from '../components/BillTemplate';
import html2pdf from 'html2pdf.js';

export default function Stage5_Payment() {
    const { id, lotId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [activeLot, setActiveLot] = useState(null);

    // Payment Fields
    const [formData, setFormData] = useState({
        invoice_number: '', invoice_weight: '',
        invoice_value: '', tds_amount: '0', cash_discount: '0', net_amount_paid: '',
        bank_name: '', branch: '', account_no: '', ifsc_code: '',
        payment_mode: 'RTGS', rtgs_reference_no: '',
        special_remarks: ''
    });

    const [approvalData, setApprovalData] = useState({ decision: 'Approve', remarks: '' });

    // Auto-Fit Logic
    const containerRef = useRef(null);
    const [scale, setScale] = useState(0.55); // Slightly smaller default for the grid view
    const [fitMode, setFitMode] = useState('page');

    // Zoom Handlers
    const handleZoomIn = () => {
        setFitMode('manual');
        setScale(prev => Math.min(prev + 0.1, 2.5));
    };

    const handleZoomOut = () => {
        setFitMode('manual');
        setScale(prev => Math.max(prev - 0.1, 0.4));
    };

    const toggleFitMode = () => {
        setFitMode(prev => prev === 'page' ? 'width' : 'page');
    };

    const handleDownload = () => {
        const element = document.getElementById('payment-bill-node');
        if (!element) return;

        // Clone to force specific styles if needed, but 'payment-bill-node' already has A4 dimensions
        const opt = {
            margin: 0,
            filename: `Payment_Req_L${activeLot?.lot_number || 'Draft'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current && fitMode !== 'manual') {
                const { clientWidth, clientHeight } = containerRef.current;
                const docWidth = 794; // A4 px
                const docHeight = 1123;
                const padding = 32;
                const availableWidth = clientWidth - padding;
                const availableHeight = clientHeight - padding;

                if (fitMode === 'width') {
                    setScale(availableWidth / docWidth);
                } else {
                    const scaleX = availableWidth / docWidth;
                    const scaleY = availableHeight / docHeight;
                    setScale(Math.min(scaleX, scaleY));
                }
            }
        };
        updateScale();
        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [fitMode]);

    useEffect(() => { fetchContract(); }, [id, lotId]);

    // Calculations
    useEffect(() => {
        const invoice = parseFloat(formData.invoice_value) || 0;
        const discount = parseFloat(formData.cash_discount) || 0;
        const tds = (invoice * 0.001).toFixed(2);
        const net = (invoice - parseFloat(tds) - discount).toFixed(2);
        setFormData(prev => {
            if (prev.tds_amount === tds && prev.net_amount_paid === net) return prev;
            return { ...prev, tds_amount: tds, net_amount_paid: net };
        });
    }, [formData.invoice_value, formData.cash_discount]);

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            setContract(res.data);
            if (res.data.lots && lotId) {
                const foundLot = res.data.lots.find(l => l.lot_id.toString() === lotId.toString());
                if (foundLot) {
                    setActiveLot(foundLot);
                    setFormData({
                        invoice_number: foundLot.invoice_number || '',
                        invoice_weight: foundLot.invoice_weight || '',
                        invoice_value: foundLot.invoice_value || '',
                        tds_amount: foundLot.tds_amount || '0',
                        cash_discount: foundLot.cash_discount || '0',
                        net_amount_paid: foundLot.net_amount_paid || '',
                        bank_name: foundLot.bank_name || '',
                        branch: foundLot.branch || '',
                        account_no: foundLot.account_no || '',
                        ifsc_code: foundLot.ifsc_code || '',
                        payment_mode: foundLot.payment_mode || 'RTGS',
                        rtgs_reference_no: foundLot.rtgs_reference_no || '',
                        special_remarks: foundLot.stage5_remarks || ''
                    });
                }
            }
        } catch (e) { console.error(e); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Prevent negative values for numeric fields
        if (['invoice_weight', 'cash_discount', 'invoice_value'].includes(name)) {
            const numValue = parseFloat(value);
            if (value === '' || numValue < 0) {
                return; // Don't allow negative values
            }
        }
        
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmitManager = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/contracts/${id}/lots/${lotId}/stage5`, formData);
            fetchContract();
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    const handleSubmitChairman = async (decision) => {
        try {
            await api.post(`/contracts/${id}/lots/${lotId}/stage5/decision`, { decision, remarks: approvalData.remarks });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    if (!contract || !activeLot) return <div className="p-10 text-center">Loading Data...</div>;

    const isManager = user.role === 'Manager';
    const isChairman = user.role === 'Chairman';
    const isApproved = activeLot.s5Decision?.decision === 'Approve';
    const isRollbackRequest = activeLot.s5Decision?.decision === 'Modify';
    const canEdit = isManager && (!activeLot.invoice_value || isRollbackRequest);

    return (
        <div className="max-w-7xl mx-auto pb-10 flex flex-col">

            {/* 1. Header & Title */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        {isChairman ? 'Payment Review' : 'Payment Requisition'}
                        <span className="text-slate-400 font-light mx-2">|</span>
                        <span className="text-lg font-mono text-slate-600">Lot {activeLot.lot_number}</span>
                    </h2>
                </div>
                <div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : (activeLot.s5Decision?.decision === 'Reject' ? 'bg-rose-50 border-rose-200 text-rose-700' : (activeLot.s5Decision?.decision === 'Modify' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-amber-50 border-amber-200 text-amber-700'))}`}>
                        {activeLot.s5Decision?.decision || 'Pending Approval'}
                    </div>
                </div>
            </div>

            {/* 2. Standard Info Grid (Same as Stage 4) */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6 items-start flex-shrink-0">
                <div>
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor</span>
                    <span className="font-bold text-slate-900 block text-lg text-indigo-700">{contract.vendor_name}</span>
                </div>
                <div>
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contract ID</span>
                    <span className="font-mono font-bold text-indigo-600 block text-lg">#{contract.contract_id}</span>
                </div>
                <div>
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">GST Number</span>
                    <span className="font-mono text-slate-700 block text-sm font-semibold text-indigo-600">{contract.gst_number || '-'}</span>
                </div>
                <div>
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sequence</span>
                    <span className="font-mono text-slate-700 block text-sm font-semibold text-indigo-600">{activeLot.sequence_start ? `${activeLot.sequence_start} (${activeLot.no_of_samples})` : '-'}</span>
                </div>
            </div>

            {/* 3. Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 h-[850px]">

                {/* LEFT: Document Viewer */}
                <div className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-inner flex flex-col h-full relative group">
                    {/* Viewer Toolbar */}
                    <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <FileText size={14} className="text-indigo-500" /> Payment Preview
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={toggleFitMode} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title={fitMode === 'page' ? "Fit Width" : "Fit Page"}>
                                {fitMode === 'page' ? <Maximize size={16} /> : <Minimize size={16} />}
                            </button>
                            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 px-1">
                                <button onClick={handleZoomOut} className="p-1.5 hover:text-slate-900 text-slate-500"><ZoomOut size={14} /></button>
                                <span className="w-10 text-center text-[10px] font-mono font-bold text-slate-600">{Math.round(scale * 100)}%</span>
                                <button onClick={handleZoomIn} className="p-1.5 hover:text-slate-900 text-slate-500"><ZoomIn size={14} /></button>
                            </div>
                            <button onClick={handleDownload} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Download PDF"><Download size={16} /></button>
                        </div>
                    </div>

                    {/* Viewport */}
                    <div ref={containerRef} className={`flex-1 overflow-auto custom-scrollbar bg-slate-200/50 flex ${fitMode === 'width' ? 'items-start justify-center' : 'items-center justify-center'} p-6 print:p-0 print:bg-white`}>
                        <div style={{ width: `${scale * 794}px`, height: `${scale * 1123}px`, transition: fitMode !== 'manual' ? 'all 0.2s ease-out' : 'none', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                            <div className="bg-white origin-top-left print:shadow-none print:transform-none" style={{ width: '794px', height: '1123px', transform: `scale(${scale})` }}>
                                <BillTemplate contract={contract} lot={activeLot} paymentData={isManager && canEdit ? formData : activeLot} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Input / Action Panel */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-y-auto shadow-sm p-6 flex flex-col h-full custom-scrollbar">
                    <div className="flex-shrink-0 border-b border-slate-100 pb-4 mb-4">
                        <h3 className="text-lg font-bold text-slate-800">
                            {isManager ? 'Payment Entry Details' : 'Payment Details & Approval'}
                        </h3>
                    </div>

                    {/* Content Area */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                        {isManager ? (
                            <>
                                {/* Display Chairman Remarks if they exist */}
                                {activeLot.s5Decision?.remarks && (
                                    <div className={`p-4 rounded-lg border mb-6 flex items-start gap-3 ${activeLot.s5Decision.decision === 'Modify' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                            activeLot.s5Decision.decision === 'Reject' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                                                'bg-indigo-50 border-indigo-200 text-indigo-800'
                                        }`}>
                                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                                                Chairman Remarks ({activeLot.s5Decision.decision})
                                            </h4>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {activeLot.s5Decision.remarks}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <form id="manager-form" onSubmit={handleSubmitManager} className={`space-y-6 ${!canEdit ? 'opacity-70 pointer-events-none' : ''}`}>
                                    {/* Section 1 */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Invoice Information</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Invoice Number</label>
                                                <input type="text" name="invoice_number" value={formData.invoice_number} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-4 text-lg font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. INV-2023-001" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Invoice Weight (Kg)</label>
                                                <input type="number" name="invoice_weight" value={formData.invoice_weight} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-4 text-lg font-bold focus:ring-2 focus:ring-indigo-500" placeholder="0.00" min="0" step="0.01" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Cash Discount</label>
                                                <input type="number" name="cash_discount" value={formData.cash_discount} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-4 text-lg font-bold focus:ring-2 focus:ring-indigo-500" placeholder="0.00" min="0" step="0.01" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Total Invoice Value (₹)</label>
                                                <input type="number" name="invoice_value" value={formData.invoice_value} onChange={handleChange} className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-4 text-xl font-bold focus:ring-2 focus:ring-indigo-500" placeholder="0.00" min="0" step="0.01" required />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2 */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-4">Bank Details</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Bank Name</label>
                                                <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-medium" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Branch</label>
                                                <input type="text" name="branch" value={formData.branch} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-medium" required />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Account No</label>
                                                    <input type="text" name="account_no" value={formData.account_no} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-mono font-medium" required />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">IFSC Code</label>
                                                    <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-mono font-medium" required />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-4">Special Remarks</h4>
                                        <textarea
                                            name="special_remarks"
                                            value={formData.special_remarks}
                                            onChange={handleChange}
                                            placeholder="Add any special remarks for this payment"
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </form>
                            </>
                                ) : (
                                /* Chairman Read-Only View */
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Invoice Details</label>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                                                <span className="text-slate-600 font-medium">{activeLot.invoice_number}</span>
                                                <span className="font-bold text-slate-900">₹ {activeLot.invoice_value}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Net Payable</label>
                                                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-700 font-bold font-mono text-lg">
                                                    ₹ {activeLot.net_amount_paid}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">TDS Amount</label>
                                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 font-mono">
                                                    ₹ {activeLot.tds_amount}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Bank Details</label>
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm space-y-1">
                                                <div className="font-bold text-slate-800">{activeLot.bank_name}</div>
                                                <div className="text-slate-600">{activeLot.branch}</div>
                                                <div className="text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200">
                                                    {activeLot.account_no} &bull; {activeLot.ifsc_code}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Special Remarks</label>
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 italic whitespace-pre-wrap">
                                                {activeLot.stage5_remarks || 'No special remarks'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        )}
                            </div>

                        {/* Bottom Action Footer */}
                        <div className="mt-6 pt-6 border-t border-slate-100 flex-shrink-0">
                            {isManager && (
                                <div className="flex justify-between items-center">
                                    <div className="text-sm">
                                        <span className="text-slate-500 mr-2">Net Payable:</span>
                                        <span className="font-bold text-slate-900 text-xl">₹ {formData.net_amount_paid || '0.00'}</span>
                                    </div>
                                    {canEdit && (
                                        <button type="submit" form="manager-form" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2">
                                            {isRollbackRequest ? <RotateCcw size={18} /> : <Check size={18} />}
                                            {isRollbackRequest ? "Update Bill" : "Generate Bill"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {isChairman && !isApproved && !activeLot.s5Decision?.decision && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Decision Remarks</label>
                                        <input
                                            type="text"
                                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Optional remarks..."
                                            value={approvalData.remarks}
                                            onChange={(e) => setApprovalData({ ...approvalData, remarks: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleSubmitChairman('Approve')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold shadow-md transition-all">
                                            Approve
                                        </button>
                                        <button onClick={() => handleSubmitChairman('Modify')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-bold shadow-sm transition-all">
                                            Payment Revision
                                        </button>
                                        <button onClick={() => handleSubmitChairman('Reject')} className="flex-1 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 py-3 rounded-lg font-bold transition-all">
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(isApproved || activeLot.s5Decision?.decision) && isChairman && (
                                <div className="flex items-center justify-center space-x-3 text-emerald-700 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                    <Check size={20} />
                                    <span className="font-bold text-sm">Decision Recorded: {activeLot.s5Decision?.decision}</span>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
            );
}
