import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, X, Eye } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import PDFModal from '../components/PDFModal';

export default function Stage4_CTL() {
    const { id, lotId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [activeLot, setActiveLot] = useState(null);

    // CTL Fields
    const [formData, setFormData] = useState({
        mic_value: '', strength: '', uhml: '', ui_percent: '', sfi: '',
        elongation: '', rd: '', plus_b: '', colour_grade: '', mat: '',
        sci: '', trash_percent: '', moisture_percent: '',
        test_date: '', confirmation_date: '', remarks: '', report_document_path: ''
    });

    const [trashSamples, setTrashSamples] = useState({});
    const [sequences, setSequences] = useState([]);

    // Valid fields for iteration
    const fieldOrder = [
        'test_date', 'confirmation_date',
        'mic_value', 'strength', 'uhml', 'ui_percent', 'sfi',
        'elongation', 'rd', 'plus_b', 'mat',
        'moisture_percent', 'remarks'
    ];

    const [approvalData, setApprovalData] = useState({ decision: 'Approve', remarks: '' });
    const [viewDocUrl, setViewDocUrl] = useState(null);
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

    useEffect(() => {
        fetchContract();
    }, [id, lotId]);

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            setContract(res.data);

            // Find Active Lot
            if (res.data.lots && lotId) {
                const foundLot = res.data.lots.find(l => l.lot_id.toString() === lotId.toString());
                if (foundLot) {
                    setActiveLot(foundLot);

                    // Populate Form
                    setFormData({
                        mic_value: foundLot.mic_value || '',
                        strength: foundLot.strength || '',
                        uhml: foundLot.uhml || '',
                        ui_percent: foundLot.ui_percent || '',
                        sfi: foundLot.sfi || '',
                        elongation: foundLot.elongation || '',
                        rd: foundLot.rd || '',
                        plus_b: foundLot.plus_b || '',
                        colour_grade: foundLot.colour_grade || '',
                        mat: foundLot.mat || '',
                        sci: foundLot.sci || '',
                        trash_percent: foundLot.trash_percent || '',
                        moisture_percent: foundLot.moisture_percent || '',
                        test_date: foundLot.test_date ? foundLot.test_date.split('T')[0] : '',
                        confirmation_date: foundLot.confirmation_date ? foundLot.confirmation_date.split('T')[0] : '',
                        remarks: foundLot.stage4_remarks || '',
                        report_document_path: foundLot.report_document_path || ''
                    });

                    // Trash Samples
                    if (foundLot.trash_percent_samples) {
                        try {
                            setTrashSamples(JSON.parse(foundLot.trash_percent_samples));
                        } catch (e) { setTrashSamples({}); }
                    }

                    // Generate Sequences
                    generateSequences(foundLot);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const generateSequences = (lot) => {
        if (lot.sequence_start && lot.no_of_samples) {
            // Parse start number from formatted string (e.g. "101/25-26" -> 101)
            const parts = lot.sequence_start.split('/');
            let start = parseInt(parts[0]);
            const count = parseInt(lot.no_of_samples);

            // Fallback if start is missing (e.g. "/25-26")
            if (isNaN(start)) start = 1;

            if (!isNaN(start) && count > 0) {
                const seqs = [];
                for (let i = 0; i < count; i++) {
                    const num = start + i;
                    seqs.push({ num: num, label: `Seq ${num}` });
                }
                setSequences(seqs);
            }
        } else if (lot.no_of_samples) {
            // Fallback if sequence_start is completely missing but we have count
            const count = parseInt(lot.no_of_samples);
            if (count > 0) {
                const seqs = [];
                for (let i = 0; i < count; i++) {
                    const num = i + 1;
                    seqs.push({ num: num, label: `Seq ${num}` });
                }
                setSequences(seqs);
            }
        }
    };

    // REMOVED SCI AUTO-CALC EFFECT

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Prevent negative values for numeric fields
        const numericFields = ['mic_value', 'strength', 'uhml', 'ui_percent', 'sfi', 'elongation', 'rd', 'plus_b', 'mat', 'sci', 'trash_percent', 'moisture_percent'];
        if (numericFields.includes(name)) {
            const numValue = parseFloat(value);
            if (value === '' || numValue < 0) {
                return; // Don't allow negative values
            }
        }
        
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTrashChange = (seq, val) => {
        setTrashSamples(prev => ({ ...prev, [seq]: val }));
    };

    const handleDocumentUpload = (path) => {
        setFormData(prev => ({ ...prev, report_document_path: path }));
    };

    const handleSubmitManager = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/contracts/${id}/lots/${lotId}/stage4`, {
                ...formData,
                trash_percent_samples: JSON.stringify(trashSamples)
            });
            fetchContract();
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    const handleSubmitChairman = async (decision) => {
        try {
            await api.post(`/contracts/${id}/lots/${lotId}/stage4/decision`, { decision, remarks: approvalData.remarks });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = api.defaults.baseURL.replace('/api', '');
        return `${baseUrl}/${path}`;
    };

    if (!contract || !activeLot) return <div className="p-10 text-center">Loading Lot Data...</div>;

    const isManager = user.role === 'Manager';
    const isChairman = user.role === 'Chairman';

    // Decisions are now at Lot Level (s4Decision)
    const isApproved = activeLot.s4Decision?.decision === 'Approve';
    const isPendingApproval = activeLot.mic_value && !isApproved; // If mic_value exists, Manager submitted.

    if (isChairman) {
        const docUrl = getFullUrl(activeLot.report_document_path);

        return (
            <div className="max-w-7xl mx-auto pb-10 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            CTL Approval - Lot {activeLot.lot_number}
                        </h2>
                    </div>
                    <div>
                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : (activeLot.s4Decision?.decision === 'Reject' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700')}`}>
                            {activeLot.s4Decision?.decision || 'Pending Approval'}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6 items-start flex-shrink-0">
                    <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor</span>
                        <span className="font-semibold text-slate-900 block">{contract.vendor_name}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contract ID</span>
                        <span className="font-mono font-semibold text-indigo-600 block">#{contract.contract_id}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">GST Number</span>
                        <span className="font-mono text-slate-700 block text-xs">{contract.gst_number || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact</span>
                        <span className="font-mono text-slate-700 block text-xs">{contract.phone_number || '-'}</span>
                    </div>
                </div>

                {/* Main Content Split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 h-[800px]">
                    {/* Left Panel: PDF Viewer */}
                    <div className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-inner flex flex-col h-full relative group">
                        {docUrl ? (
                            <iframe
                                src={docUrl}
                                className="w-full h-full bg-white"
                                title="CTL Report"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Eye size={48} className="mb-2 opacity-50" />
                                <span className="font-medium">No CTL Report Available</span>
                            </div>
                        )}
                        {/* Overlay Link */}
                        {docUrl && (
                            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-lg text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-slate-200">
                                <Eye size={16} />
                            </a>
                        )}
                    </div>

                    {/* Right Panel: Data & Actions */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-y-auto shadow-sm p-6 flex flex-col h-full custom-scrollbar">
                        <div className="flex-shrink-0 border-b border-slate-100 pb-4 mb-4">
                            <h3 className="text-lg font-bold text-slate-800">CTL Parameters</h3>
                        </div>

                        {/* Data Display */}
                        <div className="space-y-6 flex-grow">
                            <div className="grid grid-cols-2 gap-4">
                                {fieldOrder.map(key => (
                                    <div key={key} className={key === 'remarks' ? 'col-span-2' : ''}>
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                            {key.replace(/_/g, ' ')}
                                        </label>
                                        <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">
                                            {formData[key] || '-'}
                                        </div>
                                    </div>
                                ))}
                                {/* Added SCI separately if it's not in fieldOrder, but it IS usually in formData. It's not in fieldOrder array above so we need to show it manually or add it */}
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">SCI</label>
                                    <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">
                                        {formData.sci || '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Colour Grade</label>
                                    <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">
                                        {formData.colour_grade || '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-lg flex-shrink-0">
                    {!isApproved && (
                        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                            <div className="flex-grow w-full md:w-auto">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Decision Remarks</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter optional remarks..."
                                    value={approvalData.remarks}
                                    onChange={(e) => setApprovalData({ ...approvalData, remarks: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => handleSubmitChairman('Reject')}
                                    className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 px-6 py-3 rounded-lg font-bold transition-all"
                                >
                                    <X size={18} /> <span>Reject</span>
                                </button>
                                <button
                                    onClick={() => handleSubmitChairman('Approve')}
                                    className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-3 rounded-lg font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <Check size={18} /> <span>Approve</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {isApproved && (
                        <div className="flex items-center justify-center space-x-3 text-emerald-700 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                            <div className="bg-emerald-100 rounded-full p-1"><Check size={20} /></div>
                            <div>
                                <h3 className="font-bold text-sm">CTL Approved</h3>
                                <p className="text-xs opacity-80">This stage has been approved by the Chairman.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // MANAGER VIEW
    return (
        <div className="max-w-4xl mx-auto pb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">CTL Entry - Lot {activeLot.lot_number}</h2>
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6 items-start">
                <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor</span>
                    <span className="font-semibold text-slate-900 block">{contract.vendor_name}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contract ID</span>
                    <span className="font-mono font-semibold text-indigo-600 block">#{contract.contract_id}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">GST Number</span>
                    <span className="font-mono text-slate-700 block text-xs">{contract.gst_number || '-'}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact</span>
                    <span className="font-mono text-slate-700 block text-xs">{contract.phone_number || '-'}</span>
                </div>
            </div>

            {/* Document Links */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Documents:</span>
                {contract.document_path && (
                    <button
                        onClick={() => setViewDocUrl(getFullUrl(contract.document_path))}
                        className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-sm bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                    >
                        <Eye size={16} className="mr-2" /> View Contract Document
                    </button>
                )}
                {activeLot.report_document_path && (
                    <button
                        onClick={() => setViewDocUrl(getFullUrl(activeLot.report_document_path))}
                        className="flex items-center text-teal-600 hover:text-teal-800 font-medium text-sm bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100 transition-colors"
                    >
                        <Eye size={16} className="mr-2" /> View CTL Report
                    </button>
                )}
            </div>

            <PDFModal isOpen={!!viewDocUrl} onClose={() => setViewDocUrl(null)} fileUrl={viewDocUrl} />

            <form onSubmit={handleSubmitManager}>
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 ${isPendingApproval || isApproved ? 'opacity-75 pointer-events-none' : ''}`}>
                    {/* Left Card: CTL Parameters */}
                    <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm h-full flex flex-col">
                        <div className="border-b border-slate-100 pb-4 mb-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">CTL Parameters</h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-grow content-start">
                            {/* Basic Inputs */}
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">Mic</label>
                                <input type="number" step="0.01" name="mic_value" value={formData.mic_value} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">Strength</label>
                                <input type="number" step="0.1" name="strength" value={formData.strength} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">UHML</label>
                                <input type="number" step="0.1" name="uhml" value={formData.uhml} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">UI %</label>
                                <input type="number" step="0.1" name="ui_percent" value={formData.ui_percent} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">SFI</label>
                                <input type="number" step="0.1" name="sfi" value={formData.sfi} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">Elongation</label>
                                <input type="number" step="0.1" name="elongation" value={formData.elongation} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">Rd</label>
                                <input type="number" step="0.1" name="rd" value={formData.rd} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">+b</label>
                                <input type="number" step="0.1" name="plus_b" value={formData.plus_b} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">MAT</label>
                                <input type="number" step="0.1" name="mat" value={formData.mat} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">Grade</label>
                                <input type="text" name="colour_grade" value={formData.colour_grade} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2.5 font-medium" />
                            </div>
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">Moisture %</label>
                                <input type="number" step="0.1" name="moisture_percent" value={formData.moisture_percent} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                            {/* SCI Input Manually */}
                            <div>
                                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wide mb-1">SCI</label>
                                <input type="number" step="1" name="sci" value={formData.sci} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-bold" min="0" />
                            </div>
                        </div>
                    </div>

                    {/* Right Card: Test & Docs */}
                    <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm h-full flex flex-col">
                        <div className="border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Test Details & Upload</h3>
                        </div>
                        <div className="space-y-6 flex-grow">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1.5">Test Date</label>
                                    <input type="date" name="test_date" value={formData.test_date} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1.5">Conf. Date</label>
                                    <input type="date" name="confirmation_date" value={formData.confirmation_date} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-medium" />
                                </div>
                            </div>

                            <div>
                                <FileUpload label="CTL Report Document" initialPath={formData.report_document_path} onUploadComplete={handleDocumentUpload} />
                            </div>

                            <div>
                                <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1.5">Remarks</label>
                                <textarea name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Optional remarks..." className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 h-24 font-medium"></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trash Samples Modal Trigger & Content */}
                {sequences.length > 0 ? (
                    <>
                        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm mb-8 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Trash Percentage Details</h3>
                                <p className="text-sm text-slate-500">Enter separate trash % for all {sequences.length} sequences.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTrashModalOpen(true)}
                                className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                                <Check size={18} /> Enter Trash Details
                            </button>
                        </div>

                        {/* Modal */}
                        {isTrashModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <h3 className="text-xl font-bold text-slate-900">Trash % per Sequence ({sequences.length} Samples)</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsTrashModalOpen(false)}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <div className="p-8 overflow-y-auto custom-scrollbar">
                                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                            {sequences.map(item => (
                                                <div key={item.num}>
                                                    <label className="block text-slate-500 text-[10px] font-bold mb-1">{item.label}</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={trashSamples[item.num] || ''}
                                                        onChange={(e) => handleTrashChange(item.num, e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2.5 font-medium text-center focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsTrashModalOpen(false)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Fallback for missing sequence data */
                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl mb-8 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-amber-800">Trash Details Configuration</h3>
                            <p className="text-sm text-amber-600">Sequence data missing. Enter number of samples to enable Trash entry.</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Qty"
                                className="w-24 p-2 rounded-lg border border-amber-300"
                                onBlur={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val > 0) generateSequences({ no_of_samples: val, sequence_start: '1' });
                                }}
                            />
                        </div>
                    </div>
                )}

                {isManager && !isPendingApproval && !isApproved && (
                    <div className="pt-4">
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold w-full shadow-lg transition-all text-lg flex justify-center items-center gap-2">
                            <Check size={24} /> Submit CTL Results
                        </button>
                    </div>
                )}
            </form>
        </div >
    );
}
