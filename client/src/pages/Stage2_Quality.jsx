import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, X, Eye, RotateCcw } from 'lucide-react';
import FileUpload from '../components/FileUpload';

export default function Stage2_Quality() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        report_date: '', report_document_path: '',
        uhml: '', ui: '', strength: '', elongation: '',
        mic: '', rd: '', plus_b: '',
        remarks: ''
    });

    const [approvalData, setApprovalData] = useState({ decision: 'Approve', remarks: '' });

    useEffect(() => {
        fetchContract();
    }, [id]);

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            setContract(res.data);
            if (res.data.stage2) {
                setFormData(res.data.stage2); // Pre-fill if exists
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleDocumentUpload = (path) => {
        setFormData(prev => ({ ...prev, report_document_path: path }));
    };

    const handleSubmitManager = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/contracts/${id}/stage2`, formData);
            fetchContract(); // Refresh
        } catch (e) { alert(e.response?.data?.error || e.message); }
    };

    const handleSubmitChairman = async (decision) => {
        try {
            await api.post(`/contracts/${id}/stage2/decision`, {
                decision,
                remarks: approvalData.remarks
            });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error || e.message); }
    };

    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = api.defaults.baseURL.replace('/api', '');
        return `${baseUrl}/${path}`;
    };

    if (loading) return <div>Loading...</div>;
    if (!contract) return <div>Contract not found</div>;

    const isManager = user.role === 'Manager';
    const isChairman = user.role === 'Chairman';
    const isApproved = contract.stage2Decision?.decision === 'Approve';
    const isPendingApproval = contract.stage2 && !isApproved;

    // Logic: View Mode if Chairman OR (Manager and (Pending Approval OR Approved))
    const isViewMode = isChairman || (isManager && (isPendingApproval || isApproved));

    if (isViewMode) {
        const pdfUrl = getFullUrl(contract.stage2?.report_document_path || contract.document_path);

        return (
            <div className="max-w-7xl mx-auto pb-10 flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            {isChairman ? "Review Quality (Stage 2)" : "Quality Details (Stage 2)"}
                        </h2>
                    </div>
                    <div>
                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                            {contract.stage2Decision?.decision || (contract.stage2 ? 'Pending Approval' : 'Pending Entry')}
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

                {/* Main Content Area - Split Screen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 h-[800px]">

                    {/* LEFT: PDF Viewer */}
                    <div className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-inner flex flex-col h-full relative group">
                        {pdfUrl ? (
                            <iframe src={pdfUrl} className="w-full h-full bg-white" title="Document Viewer" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Eye size={48} className="mb-2 opacity-50" />
                                <span className="font-medium">No Document Available</span>
                            </div>
                        )}
                        {/* Overlay Link */}
                        {pdfUrl && (
                            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-lg text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-slate-200">
                                <Eye size={16} />
                            </a>
                        )}
                    </div>

                    {/* RIGHT: Manager Data (Scrollable) */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-y-auto shadow-sm p-6 flex flex-col h-full custom-scrollbar">
                        <div className="flex-shrink-0 border-b border-slate-100 pb-4 mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Manager Input Details</h3>
                        </div>

                        <div className="space-y-6 flex-grow">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Report Date</label>
                                    <div className="text-slate-900 font-medium">{formData.report_date || '-'}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-3 border-b border-slate-100 pb-1">Average Parameters</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-2">
                                    {['uhml', 'ui', 'strength', 'elongation', 'mic', 'rd', 'plus_b'].map(field => (
                                        <div key={field} className="border-l-2 border-slate-100 pl-3">
                                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">{field.replace(/_/g, ' ')}</span>
                                            <span className="text-slate-900 font-mono font-medium text-lg">{formData[field] || '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Manager Remarks</label>
                                <div className="bg-slate-50 p-4 rounded-lg text-slate-700 text-sm italic border border-slate-100">
                                    {formData.remarks || 'No remarks provided.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM: Action Area (Common) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-lg flex-shrink-0">
                    {/* Chairman Actions */}
                    {isChairman && isPendingApproval && (
                        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                            <div className="flex-grow w-full md:w-auto">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Decision Remarks</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter optional remarks for approval/rejection..."
                                    value={approvalData.remarks}
                                    onChange={(e) => setApprovalData({ ...approvalData, remarks: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button onClick={() => handleSubmitChairman('Reject')} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 px-6 py-3 rounded-lg font-bold transition-all">
                                    <X size={18} /> <span>Reject</span>
                                </button>
                                <button onClick={() => handleSubmitChairman('Approve')} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-3 rounded-lg font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                                    <Check size={18} /> <span>Approve</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Approved State */}
                    {isApproved && (
                        <div className="flex items-center justify-center space-x-3 text-emerald-700 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                            <div className="bg-emerald-100 rounded-full p-1"><Check size={20} /></div>
                            <div>
                                <h3 className="font-bold text-sm">Quality Approved</h3>
                                <p className="text-xs opacity-80">This stage has been approved by the Chairman on {new Date(contract.stage2Decision?.decision_date).toLocaleDateString()}.</p>
                            </div>
                        </div>
                    )}

                    {/* Manager Pending State */}
                    {isManager && isPendingApproval && (
                        <div className="flex items-center justify-center space-x-3 text-amber-700 bg-amber-50 p-4 rounded-lg border border-amber-100">
                            <div className="bg-amber-100 rounded-full p-1"><RotateCcw size={20} /></div>
                            <div>
                                <h3 className="font-bold text-sm">Pending Approval</h3>
                                <p className="text-xs opacity-80">Waiting for Chairman's decision. You cannot make changes at this time.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default: Manager Entry Form
    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Quality Entry (Stage 2)</h2>
                    <p className="text-slate-500 font-medium">Contract #{contract.contract_id} - {contract.vendor_name}</p>
                </div>
            </div>

            {/* Manager Form */}
            <form onSubmit={handleSubmitManager} className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                {/* Left Card: Average Quality Parameters */}
                <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm h-full flex flex-col">
                    <div className="border-b border-slate-100 pb-4 mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Parameter Inputs
                            <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Averages</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-6 flex-grow content-start">
                        {['mic', 'rd', 'plus_b', 'uhml', 'ui', 'strength', 'elongation'].map(field => (
                            <div key={field} className={['mic', 'rd', 'plus_b'].includes(field) ? 'col-span-2 sm:col-span-1' : 'col-span-2 sm:col-span-1'}>
                                <label className="block text-slate-500 text-[10px] uppercase mb-1.5 font-bold tracking-wide">
                                    <span className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded mr-1">AVG</span>
                                    {field.replace(/_/g, ' ')}
                                </label>
                                <input
                                    type="number"
                                    name={field}
                                    value={formData[field] || ''}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 text-lg font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                                    step="any"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Card: Report Details & Upload */}
                <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm h-full flex flex-col">
                    <div className="border-b border-slate-100 pb-4 mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Report Details</h3>
                    </div>

                    <div className="space-y-6 flex-grow">
                        <div>
                            <label className="block text-slate-500 text-xs uppercase mb-1 font-bold tracking-wide">Report Date</label>
                            <input type="date" name="report_date" value={formData.report_date} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3" />
                        </div>

                        <div className="pt-2">
                            <FileUpload
                                label="Upload Quality Report"
                                initialPath={formData.report_document_path}
                                onUploadComplete={handleDocumentUpload}
                            />
                        </div>

                        <div>
                            <label className="block text-slate-500 text-xs uppercase mb-1 font-bold tracking-wide">Manager Remarks</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks || ''}
                                onChange={handleChange}
                                placeholder="Enter any specific observations..."
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-indigo-500 transition-all"
                            ></textarea>
                        </div>
                    </div>

                    <div className="pt-8 mt-auto border-t border-slate-100">
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2">
                            <Check size={20} /> Submit Quality Report
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
