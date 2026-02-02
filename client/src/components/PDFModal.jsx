import React from 'react';
import { X, Check, AlertCircle } from 'lucide-react';

export default function PDFModal({ isOpen, onClose, fileUrl, onConfirm, isConfirmationMode = false }) {
    if (!isOpen || !fileUrl) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col items-center relative animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="w-full flex justify-between items-center p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                            📄 Document Viewer
                        </h3>
                        {isConfirmationMode && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertCircle size={16} className="text-amber-600" />
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                                    Preview Required
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="w-full flex-1 bg-slate-50 p-1 overflow-hidden">
                    <iframe
                        src={fileUrl}
                        className="w-full h-full rounded-b-lg border-none"
                        title="PDF Viewer"
                    />
                </div>

                {/* Footer with Confirmation Actions */}
                {isConfirmationMode && onConfirm && (
                    <div className="w-full p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600 font-medium">
                                Please review the document carefully. Confirm if this is the correct file.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    <Check size={18} />
                                    Confirm & Use This Document
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
