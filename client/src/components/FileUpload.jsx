import React, { useState } from 'react';
import api from '../api';
import { Upload, FileText, Check, Loader2, Eye } from 'lucide-react';
import PDFModal from './PDFModal';

export default function FileUpload({ onUploadComplete, initialPath, label }) {
    const [uploading, setUploading] = useState(false);
    const [filePath, setFilePath] = useState(initialPath || '');
    const [showModal, setShowModal] = useState(false);

    // Handle File Selection
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation: PDF Only
        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFilePath(res.data.filePath);
            if (onUploadComplete) {
                onUploadComplete(res.data.filePath);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('File upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = api.defaults.baseURL.replace('/api', '');
        return `${baseUrl}/${path}`;
    };

    return (
        <div className="mb-4">
            <label className="block text-slate-600 mb-2 font-medium text-sm">{label || 'Upload Document'}</label>

            <div className="flex items-center space-x-3">
                {/* Upload Button */}
                <div className="relative">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />
                    <div className={`flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors ${uploading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}>
                        {uploading ? <Loader2 className="animate-spin text-indigo-600 mr-2" size={18} /> : <Upload className="text-slate-500 mr-2" size={18} />}
                        <span className="text-sm font-medium text-slate-700">{uploading ? 'Uploading...' : 'Choose PDF File'}</span>
                    </div>
                </div>

                {/* Status / View Link */}
                {filePath && (
                    <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 animate-in fade-in">
                        <Check size={16} className="mr-1.5" />
                        <span className="text-xs font-semibold mr-3">Uploaded</span>

                        <button
                            type="button"
                            onClick={() => setShowModal(true)}
                            className="flex items-center text-indigo-600 hover:text-indigo-800 text-xs font-bold border-l border-emerald-200 pl-3 hover:underline"
                        >
                            <Eye size={14} className="mr-1" /> View
                        </button>
                    </div>
                )}
            </div>

            {!filePath && (
                <p className="text-xs text-slate-400 mt-1 pl-1">Supported format: PDF only</p>
            )}

            <PDFModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                fileUrl={getFullUrl(filePath)}
            />
        </div>
    );
}
