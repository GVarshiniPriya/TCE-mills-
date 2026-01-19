import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Box } from 'lucide-react';

export default function Stage3_Sampling() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [numberOfLots, setNumberOfLots] = useState(1);
    const [lots, setLots] = useState([{
        lot_number: '',
        arrival_date: new Date().toISOString().split('T')[0],
        sequence_start_num: '',
        no_of_samples: ''
    }]);

    useEffect(() => {
        fetchContract();
    }, [id]);

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            setContract(res.data);
            if (res.data.lots && res.data.lots.length > 0) {
                // If lots exist, populate them
                setNumberOfLots(res.data.lots.length);
                const loadedLots = res.data.lots.map(l => {
                    const startNum = l.sequence_start ? l.sequence_start.split('/')[0] : '';
                    return {
                        lot_number: l.lot_number,
                        arrival_date: l.arrival_date ? l.arrival_date.split('T')[0] : '',
                        sequence_start_num: startNum,
                        no_of_samples: l.no_of_samples || ''
                    };
                });
                setLots(loadedLots);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Financial Year Helper
    const getFinancialYearSuffix = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.getMonth();
        const year = date.getFullYear();
        let startYear = year;
        if (month < 3) startYear = year - 1;
        return `/${(startYear % 100)}-${(startYear + 1) % 100}`;
    };

    const handleLotCountChange = (e) => {
        const count = parseInt(e.target.value) || 1;
        setNumberOfLots(count);
        // Resize array, preserving existing data where possible
        setLots(prev => {
            const newLots = [...prev];
            if (count > prev.length) {
                for (let i = prev.length; i < count; i++) {
                    newLots.push({
                        lot_number: '',
                        arrival_date: new Date().toISOString().split('T')[0],
                        sequence_start_num: '',
                        no_of_samples: ''
                    });
                }
            } else if (count < prev.length) {
                newLots.length = count;
            }
            return newLots;
        });
    };

    const handleLotChange = (index, field, value) => {
        setLots(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const calculateEnd = (start, count) => {
        if (!start || !count) return '';
        return parseInt(start) + parseInt(count) - 1;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = lots.map(lot => {
            const fySuffix = getFinancialYearSuffix(lot.arrival_date);
            const startFormat = `${lot.sequence_start_num}${fySuffix}`;
            const endNum = calculateEnd(lot.sequence_start_num, lot.no_of_samples);
            const endFormat = endNum ? `${endNum}${fySuffix}` : '';

            return {
                lot_id: lot.lot_id, // Include ID for updates
                lot_number: lot.lot_number,
                arrival_date: lot.arrival_date,
                sequence_start: startFormat,
                sequence_end: endFormat,
                no_of_samples: parseInt(lot.no_of_samples)
            };
        });

        try {
            await api.post(`/contracts/${id}/stage3`, { lots: payload });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    if (!contract) return <div>Loading...</div>;
    const isManager = user.role === 'Manager';

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Sampling Entry</h2>

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
                {contract.document_path && (
                    <div className="col-span-2 md:col-span-4 mt-2 pt-4 border-t border-slate-100">
                        <a
                            href={contract.document_path.startsWith('http') ? contract.document_path : `${api.defaults.baseURL.replace('/api', '')}/${contract.document_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-xs bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                        >
                            View Contract Document
                        </a>
                    </div>
                )}
            </div>

            {/* Config Card */}
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-lg text-indigo-600 shadow-sm">
                        <Box size={24} />
                    </div>
                    <div>
                        <label className="block text-indigo-900 text-sm font-bold mb-1">Number of Lots</label>
                        <p className="text-indigo-600/80 text-xs">How many lots in this shipment?</p>
                    </div>
                </div>
                <div className="w-32">
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={numberOfLots}
                        onChange={handleLotCountChange}
                        className="w-full text-center text-xl font-bold bg-white border-2 border-indigo-100 rounded-lg py-2 focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all text-indigo-900"
                        readOnly={!isManager}
                    />
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                    {lots.map((lot, index) => {
                        const fySuffix = getFinancialYearSuffix(lot.arrival_date);
                        const endNum = calculateEnd(lot.sequence_start_num, lot.no_of_samples);

                        return (
                            <div key={index} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
                                <div className="absolute top-0 left-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-br-lg uppercase tracking-wider group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                    Lot #{index + 1}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-4">
                                    {/* Lot No */}
                                    <div>
                                        <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1.5">Lot Number</label>
                                        <input
                                            type="text"
                                            value={lot.lot_number}
                                            onChange={(e) => handleLotChange(index, 'lot_number', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                                            placeholder={`Lot ${index + 1}`}
                                            readOnly={!isManager}
                                        />
                                    </div>

                                    {/* Arrival Date */}
                                    <div>
                                        <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1.5">Arrival Date</label>
                                        <input
                                            type="date"
                                            value={lot.arrival_date}
                                            onChange={(e) => handleLotChange(index, 'arrival_date', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                                            readOnly={!isManager}
                                        />
                                    </div>

                                    {/* Sequence Start */}
                                    <div>
                                        <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1.5">Sequence Start</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={lot.sequence_start_num}
                                                onChange={(e) => handleLotChange(index, 'sequence_start_num', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                                                placeholder="101"
                                                readOnly={!isManager}
                                            />
                                            {fySuffix && <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-bold pointer-events-none">{fySuffix}</span>}
                                        </div>
                                    </div>

                                    {/* No of Samples / End */}
                                    <div>
                                        <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1.5">No. of Samples</label>
                                        <div className="relative group/input">
                                            <input
                                                type="number"
                                                value={lot.no_of_samples}
                                                onChange={(e) => handleLotChange(index, 'no_of_samples', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                                                placeholder="50"
                                                readOnly={!isManager}
                                            />
                                            {/* Pop-up Text Msg (Tooltip style) */}
                                            {lot.sequence_start_num && lot.no_of_samples && endNum && (
                                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xl opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 flex items-center gap-2">
                                                    <span>Sequence: {lot.sequence_start_num}{fySuffix} - {endNum}</span>
                                                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isManager && (
                    <button type="submit" className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        <span>Submit {numberOfLots} Lots</span>
                    </button>
                )}
            </form>
        </div>
    );
}
