import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertTriangle, ArrowRight, Search, Edit3, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending'); // Default to Pending
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        try {
            const res = await api.get(`/contracts?t=${Date.now()}`);
            setContracts(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        if (status.includes('Pending')) return 'text-amber-700 bg-amber-50 border-amber-200';
        if (status === 'Closed' || status.includes('Approved')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        if (status.includes('Rollback') || status.includes('Rejected')) return 'text-rose-700 bg-rose-50 border-rose-200';
        return 'text-slate-600 bg-slate-100 border-slate-200';
    };

    const handleAction = (c) => {
        // If Lot ID is present, use Lot-Specific Routes for Stage 4/5
        const lotPath = c.lot_id ? `/lots/${c.lot_id}` : ''; // Part of URL

        // Stage 3 is Contract Level (Creation of Lots), so usually goes to /stage3 (no lot id)
        // Stage 4/5 are Lot Level.

        switch (c.stage) {
            case 2: navigate(`/contracts/${c.contract_id}/stage2`); break;
            case 3: navigate(`/contracts/${c.contract_id}/stage3`); break;
            case 4: navigate(`/contracts/${c.contract_id}${lotPath}/stage4`); break;
            case 5: navigate(`/contracts/${c.contract_id}${lotPath}/stage5`); break;
            default: navigate(`/contracts/${c.contract_id}/view`); break;
        }
    };

    // Derived State
    const filteredContracts = contracts.filter(c => {
        // Search Filter
        const matchesSearch = c.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.contract_id.toString().includes(searchTerm);

        // Status Filter
        let matchesStatus = true;

        if (filterStatus === 'action_required') {
            if (user?.role === 'Chairman') {
                // Chairman sees approval tasks AND privileged vendor payment entries
                matchesStatus = c.status.includes('Pending Chairman Approval') || c.status.includes('Pending Payment Entry');
            } else {
                // Manager sees everything NOT waiting for Chairman and NOT Closed/Approved
                // Includes: Pending Entry, Sampling, Rollback, and Rejected (so they can act/see)
                matchesStatus = !c.status.includes('Pending Chairman Approval') &&
                    !c.status.includes('Closed') &&
                    !c.status.includes('Approved');
            }
        }
        else if (filterStatus === 'pending') {
            if (user?.role === 'Chairman') {
                // For Chairman, show approval tasks AND privileged vendor payment entries
                matchesStatus = c.status.includes('Pending Chairman Approval') || c.status.includes('Pending Payment Entry');
            } else {
                // Manager sees 'Pending' and 'Rollback' as pending actions
                matchesStatus = c.status.includes('Pending') || c.status.includes('Rollback');
            }
        }
        else if (filterStatus === 'approved') matchesStatus = c.status.includes('Approved') || c.status === 'Closed';
        else if (filterStatus === 'rejected') matchesStatus = c.status.includes('Rejected'); // Rollback moved to Pending for clarity

        // Chairman should not see rolled back contracts
        const chairmanHidesRollback = !(user?.role === 'Chairman' && c.status.includes('Rollback'));

        return matchesSearch && matchesStatus && chairmanHidesRollback;
    });

    // Stats Logic
    const stats = {
        total: contracts.length,
        // Manager Pending includes Rollbacks, Chairman sees approval tasks AND privileged vendor payment entries
        pending: contracts.filter(c => {
            if (user?.role === 'Chairman') {
                return c.status.includes('Pending Chairman Approval') || c.status.includes('Pending Payment Entry');
            }
            return c.status.includes('Pending') || c.status.includes('Rollback');
        }).length,
        completed: contracts.filter(c => c.status === 'Closed' || c.status.includes('Approved')).length,
        attention: contracts.filter(c => c.status.includes('Rollback')).length
    };

    return (
        <div className="space-y-8">
            {/* Header & Stats */}
            <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Dashboard Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Contracts</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Clock size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Pending Action</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Completed</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Nav. Attention</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.attention}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search contracts or vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                </div>

                <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-slate-500">Filter By:</span>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Denied</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                            <th className="px-6 py-4">Contract ID</th>
                            <th className="px-6 py-4">Lot No</th>
                            <th className="px-6 py-4">Vendor</th>
                            <th className="px-6 py-4">GST No</th>
                            <th className="px-6 py-4">Progress</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredContracts.map((c, idx) => (
                            <tr key={`${c.contract_id}-${c.lot_id || 'main'}-${idx}`} className="hover:bg-indigo-50/30 transition-colors group cursor-default">
                                <td className="px-6 py-4 font-mono text-indigo-600 font-bold">#{c.contract_id}</td>
                                <td className="px-6 py-4 font-mono text-slate-700 font-bold">
                                    {c.lot_number ? <span className="bg-slate-100 px-2 py-1 rounded text-xs">Lot {c.lot_number}</span> : <span className="text-slate-400 text-xs">-</span>}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">{c.vendor_name}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{c.gst_number || '-'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-0.5">
                                        {[
                                            { id: 1, label: 'Contract' },
                                            { id: 2, label: 'Quality' },
                                            { id: 3, label: 'Sampling' },
                                            { id: 4, label: 'CTL' }, // Shortened for space
                                            { id: 5, label: 'Payment' }
                                        ].map((step, index, array) => {
                                            let colorClass = 'bg-slate-100 text-slate-400 border-slate-200'; // Future
                                            if (step.id < c.stage) colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200'; // Past
                                            if (step.id === c.stage) colorClass = 'bg-rose-100 text-rose-700 border-rose-200 ring-1 ring-rose-200 font-bold'; // Current

                                            return (
                                                <React.Fragment key={step.id}>
                                                    <div className={`px-2 py-1 rounded text-[10px] uppercase tracking-wide border ${colorClass}`}>
                                                        {step.label}
                                                    </div>
                                                    {index < array.length - 1 && (
                                                        <ChevronRight 
                                                            size={14} 
                                                            className={`mx-0.5 ${
                                                                step.id < c.stage 
                                                                    ? 'text-emerald-500' 
                                                                    : step.id === c.stage 
                                                                    ? 'text-rose-500' 
                                                                    : 'text-slate-300'
                                                            }`} 
                                                        />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-1">
                                        {/* Show warning for rolled back or rejected contracts */}
                                        {(c.status.includes('Rollback') || c.status.includes('Rejected')) && (
                                            <span className="text-[10px] font-bold text-rose-600">
                                                ⚠️ {c.status.includes('Rollback') ? 'Rollback Requested' : c.status}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleAction(c)}
                                        className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-100 active:scale-95 transform"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredContracts.length === 0 && !loading && (
                            <tr>
                                <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                            <Search size={24} />
                                        </div>
                                        <p className="text-lg font-medium text-slate-500">No contracts found</p>
                                        <p className="text-sm">Try adjusting your search or filters</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
