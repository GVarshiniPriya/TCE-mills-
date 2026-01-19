import React from 'react';
import { X } from 'lucide-react';

export default function PDFModal({ isOpen, onClose, fileUrl }) {
    if (!isOpen || !fileUrl) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col items-center relative animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="w-full flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        📄 Document Viewer
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="w-full h-full bg-slate-50 p-1">
                    <iframe
                        src={fileUrl}
                        className="w-full h-full rounded-b-lg border-none"
                        title="PDF Viewer"
                    />
                </div>
            </div>
        </div>
    );
}
