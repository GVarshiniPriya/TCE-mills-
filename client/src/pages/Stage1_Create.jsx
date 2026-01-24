import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X, ChevronDown, ChevronUp, Check, RotateCcw, X as CloseIcon, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FileUpload from '../components/FileUpload';

export default function Stage1_Create() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showParams, setShowParams] = useState(false);

    // Approval State
    const [contract, setContract] = useState(null);
    const [approvalData, setApprovalData] = useState({ decision: 'Approve', remarks: '' });

    // Contract Form State
    const [formData, setFormData] = useState({
        contract_id: '',
        vendor_id: '',
        cotton_type: '',
        quality: '',
        quantity: '',
        price: '',
        document_path: '',
        entry_date: new Date().toISOString().split('T')[0]
    });

    // Optional Parameters State
    const [params, setParams] = useState({
        uhml: '', gpt: '', mic: '', sfi: '', elongation: '', rd: '', plus_b: '',
        mat: '', sci: '', trash: '', sfc_n: '', neps: '', moisture: '',
        ui: '', grade: '', strength: '', stability: ''
    });

    // Vendor Form State
    const [vendorData, setVendorData] = useState({
        vendor_name: '',
        gst_number: '',
        state: '',
        email: '',
        phone_number: '',
        address: '',
        is_privileged: false
    });

    useEffect(() => {
        fetchVendors();
        if (id) fetchContract();
    }, [id]);

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            const data = res.data;
            setContract(data);
            setFormData({
                contract_id: data.contract_id,
                vendor_id: data.vendor_id,
                cotton_type: data.cotton_type,
                quality: data.quality,
                quantity: data.quantity,
                price: data.price,
                document_path: data.document_path,
                entry_date: data.entry_date
            });
            if (data.stage1_params) {
                setParams(data.stage1_params);
                setShowParams(true);
            }
        } catch (e) { console.error(e); }
    };

    const fetchVendors = async () => {
        try {
            const res = await api.get('/vendors');
            setVendors(res.data);
        } catch (e) { console.error(e); }
    };

    const handleContractChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleParamChange = (e) => {
        setParams({ ...params, [e.target.name]: e.target.value });
    };

    const handleDocumentUpload = (path) => {
        setFormData(prev => ({ ...prev, document_path: path }));
    };

    const handleVendorChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setVendorData({ ...vendorData, [e.target.name]: value });
    };

    const submitContract = async (e) => {
        e.preventDefault();
        try {
            // Filter empty params to keep DB clean, or send all.
            // Sending as is allows user to see what they left blank if they edit later.
            const payload = { ...formData, params: showParams ? params : null };

            const response = await api.post('/contracts', payload);
            const { contract_id, lot_id } = response.data;

            // Check if vendor is privileged
            const selectedVendor = vendors.find(v => v.vendor_id == formData.vendor_id);
            if (selectedVendor && selectedVendor.is_privileged && lot_id) {
                // Navigate directly to payment stage
                navigate(`/contracts/${contract_id}/lots/${lot_id}/stage5`);
            } else {
                navigate('/dashboard');
            }
        } catch (e) {
            alert('Error creating contract: ' + (e.response?.data?.message || e.message));
        }
    };

    const submitVendor = async (e) => {
        e.preventDefault();
        try {
            await api.post('/vendors', vendorData);
            setShowVendorModal(false);
            fetchVendors();
            setVendorData({ vendor_name: '', gst_number: '', state: '', email: '', phone_number: '', address: '', is_privileged: false });
        } catch (e) {
            alert('Error adding vendor');
        }
    };

    const paramFields = [
        'uhml', 'gpt', 'mic', 'sfi', 'elongation', 'rd', 'plus_b', 'mat',
        'sci', 'trash', 'sfc_n', 'neps', 'moisture', 'ui', 'grade', 'strength', 'stability'
    ];

    const handleSubmitChairman = async (decision) => {
        try {
            await api.post(`/contracts/${id}/stage1/decision`, { decision, remarks: approvalData.remarks });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    const isChairman = user.role === 'Chairman';
    const isManager = user.role === 'Manager';
    const isViewMode = !!id;

    if (isViewMode) {
        if (!contract) return <div>Loading...</div>; // Safety check

        const isPendingApproval = contract.stage1Decision?.decision !== 'Approve' && contract.stage1Decision?.decision !== 'Reject';
        const isApprove = contract.stage1Decision?.decision === 'Approve';
        const pdfUrl = contract.document_path ? (contract.document_path.startsWith('http') ? contract.document_path : `${api.defaults.baseURL.replace('/api', '')}/${contract.document_path}`) : null;
        console.log("DEBUG: PDF URL:", pdfUrl);

        return (
            <div className="max-w-7xl mx-auto pb-10 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            {isChairman ? "Review Contract (Stage 1)" : "Contract Details (Stage 1)"}
                        </h2>
                    </div>
                    <div>
                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${contract.stage1Decision?.decision === 'Approve' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : (contract.stage1Decision?.decision === 'Reject' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700')}`}>
                            {contract.stage1Decision?.decision || 'Pending Approval'}
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

                    {/* LEFT: PDF Viewer */}
                    <div className="bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-inner flex flex-col h-full relative group">
                        {pdfUrl ? (
                            <iframe src={pdfUrl} className="w-full h-full bg-white" title="Contract Document" />
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

                    {/* RIGHT: Data Panel */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-y-auto shadow-sm p-6 flex flex-col h-full custom-scrollbar">
                        <div className="flex-shrink-0 border-b border-slate-100 pb-4 mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Contract Information</h3>
                        </div>

                        <div className="space-y-6 flex-grow">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vendor ID</label>
                                    <div className="text-slate-900 font-medium">{contract.vendor_id}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vendor Name</label>
                                    <div className="text-slate-900 font-medium">{contract.vendor_name || 'Loading...'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Cotton Type</label>
                                    <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">{contract.cotton_type}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Quality</label>
                                    <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">{contract.quality}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Quantity</label>
                                    <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">{contract.quantity}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Price</label>
                                    <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">{contract.price}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Entry Date</label>
                                    <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">{contract.entry_date}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">GST Number</label>
                                    <div className="text-slate-900 font-medium border-b border-slate-100 pb-1">{contract.gst_number || '-'}</div>
                                </div>
                            </div>

                            {contract.stage1_params && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Additional Parameters</label>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {Object.entries(JSON.parse(contract.stage1_params || '{}')).map(([key, val]) => (
                                            <div key={key} className="flex flex-col">
                                                <span className="text-xs text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                                <span className="font-medium text-slate-700">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTTOM: Action Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-lg flex-shrink-0">
                    {/* Chairman Actions */}
                    {isChairman && !contract.stage1Decision?.decision && (
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
                    {isApprove && (
                        <div className="flex items-center justify-center space-x-3 text-emerald-700 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                            <div className="bg-emerald-100 rounded-full p-1"><Check size={20} /></div>
                            <div>
                                <h3 className="font-bold text-sm">Contract Approved</h3>
                                <p className="text-xs opacity-80">This contract has been approved by the Chairman.</p>
                            </div>
                        </div>
                    )}

                    {/* Manager Pending State */}
                    {isManager && !contract.stage1Decision?.decision && (
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
        )
    }

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Create New Contract</h2>

            <div className="pb-10">
                <form onSubmit={submitContract} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Card: Contract Details */}
                    <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm h-full flex flex-col">
                        <div className="border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Contract Basics</h3>
                        </div>

                        <div className="space-y-6 flex-grow">
                            <div>
                                <label className="block text-slate-600 mb-1.5 font-bold text-xs uppercase tracking-wide">Contract ID *</label>
                                <input type="text" name="contract_id" placeholder="e.g. CON-001" value={formData.contract_id} onChange={handleContractChange} required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-600 mb-1.5 font-bold text-xs uppercase tracking-wide">Cotton Type</label>
                                    <select name="cotton_type" value={formData.cotton_type} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-medium">
                                        <option value="">Select Cotton Type</option>
                                        <option value="Domestic">Domestic</option>
                                        <option value="Import">Import</option>
                                        <option value="Waste">Waste</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-600 mb-1.5 font-bold text-xs uppercase tracking-wide">Quality</label>
                                    <input type="text" name="quality" placeholder="e.g. Grade A" value={formData.quality} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-600 mb-1.5 font-bold text-xs uppercase tracking-wide">Quantity (Bales)</label>
                                    <input type="number" name="quantity" placeholder="e.g. 100" value={formData.quantity} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-slate-600 mb-1.5 font-bold text-xs uppercase tracking-wide">Price</label>
                                    <input type="number" name="price" placeholder="e.g. 55000" value={formData.price} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-600 mb-1.5 font-bold text-xs uppercase tracking-wide">Entry Date</label>
                                <input type="date" name="entry_date" value={formData.entry_date} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
                            </div>

                            {/* Optional Params Button */}
                            <div className="pt-4 border-t border-slate-100 mt-auto">
                                <button
                                    type="button"
                                    onClick={() => setShowParams(true)}
                                    className="w-full bg-indigo-50 text-indigo-700 px-4 py-3 rounded-lg font-bold text-sm flex items-center justify-center hover:bg-indigo-100 transition-colors border border-indigo-100"
                                >
                                    <Plus size={16} className="mr-2" /> Add Internal Quality Parameters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Card: Vendor & Docs */}
                    <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm h-full flex flex-col">
                        <div className="border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Vendor & Documentation</h3>
                        </div>

                        <div className="space-y-6 flex-grow">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-slate-600 font-bold text-xs uppercase tracking-wide">Select Vendor</label>
                                    <button type="button" onClick={() => setShowVendorModal(true)} className="text-indigo-600 text-xs flex items-center hover:text-indigo-500 font-bold uppercase tracking-wide">
                                        <Plus size={14} className="mr-1" /> New Vendor
                                    </button>
                                </div>
                                <select name="vendor_id" value={formData.vendor_id} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-medium">
                                    <option value="">Select Vendor</option>
                                    {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name} - {v.gst_number}</option>)}
                                </select>
                            </div>

                            <div className="pt-2">
                                <FileUpload
                                    label="Contract Document"
                                    initialPath={formData.document_path}
                                    onUploadComplete={handleDocumentUpload}
                                />
                            </div>
                        </div>

                        <div className="pt-8 mt-auto border-t border-slate-100">
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform flex items-center justify-center gap-2">
                                <Plus size={20} /> Create Contract
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Quality Parameters Modal */}
            {showParams && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowParams(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X /></button>
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Internal Quality Parameters</h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {paramFields.map(key => (
                                <div key={key}>
                                    <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1">{key.replace(/_/g, ' ')}</label>
                                    <input
                                        type={key === 'grade' || key === 'colour_grade' ? 'text' : 'number'}
                                        name={key}
                                        value={params[key]}
                                        onChange={handleParamChange}
                                        placeholder=""
                                        step="any"
                                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end mt-8 space-x-4">
                            <button
                                type="button"
                                onClick={() => setShowParams(false)}
                                className="px-6 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Vendor Modal */}
            {
                showVendorModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
                            <button onClick={() => setShowVendorModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X /></button>
                            <h3 className="text-xl font-bold text-slate-900 mb-6">Add New Vendor</h3>
                            <form onSubmit={submitVendor} className="space-y-4">
                                <input type="text" name="vendor_name" placeholder="Vendor Name" value={vendorData.vendor_name} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
                                <input type="text" name="gst_number" placeholder="GST Number" value={vendorData.gst_number} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
                                <input type="text" name="state" placeholder="State" value={vendorData.state} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
                                <input type="email" name="email" placeholder="Email" value={vendorData.email} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
                                <input type="tel" name="phone_number" placeholder="Phone Number" value={vendorData.phone_number} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
                                <textarea name="address" placeholder="Address" value={vendorData.address} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 h-24 focus:ring-2 focus:ring-indigo-500" />
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" name="is_privileged" checked={vendorData.is_privileged} onChange={handleVendorChange} id="priv" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    <label htmlFor="priv" className="text-slate-700 font-medium">Privileged Vendor</label>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg mt-4 shadow-lg hover:shadow-indigo-500/30 transition-all">Save Vendor</button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
