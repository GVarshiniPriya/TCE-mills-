import React, { useState, useEffect } from 'react';
import api from '../api';
import { Upload, FileText, Check, Loader2, Eye, AlertCircle } from 'lucide-react';
import PDFModal from './PDFModal';

export default function FileUpload({ onUploadComplete, initialPath, label }) {
    const [uploading, setUploading] = useState(false);
    const [filePath, setFilePath] = useState(initialPath || '');
    const [showModal, setShowModal] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(!!initialPath); // If initialPath exists, consider it pre-confirmed
    const [pendingFilePath, setPendingFilePath] = useState(null); // File uploaded but not yet confirmed

    // Reset confirmed state when initialPath changes externally
    useEffect(() => {
        if (initialPath) {
            setFilePath(initialPath);
            setIsConfirmed(true);
            setPendingFilePath(null);
        }
    }, [initialPath]);

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
            // Store as pending until confirmed
            setPendingFilePath(res.data.filePath);
            setIsConfirmed(false);
            // Automatically open preview modal for mandatory preview
            setShowModal(true);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('File upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // Handle confirmation after preview
    const handleConfirm = () => {
        if (pendingFilePath) {
            setFilePath(pendingFilePath);
            setIsConfirmed(true);
            setShowModal(false);
            // Now call the callback to notify parent component
            if (onUploadComplete) {
                onUploadComplete(pendingFilePath);
            }
            setPendingFilePath(null);
        }
    };

    // Handle cancel/reject - remove the uploaded file
    const handleCancel = () => {
        setShowModal(false);
        setPendingFilePath(null);
        setIsConfirmed(false);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
    };

    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = api.defaults.baseURL.replace('/api', '');
        return `${baseUrl}/${path}`;
    };

    // Determine which file URL to show in modal (pending or confirmed)
    const modalFileUrl = pendingFilePath ? getFullUrl(pendingFilePath) : getFullUrl(filePath);

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

                {/* Status Indicators */}
                {pendingFilePath && !isConfirmed && (
                    <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200 animate-in fade-in">
                        <AlertCircle size={16} className="mr-1.5" />
                        <span className="text-xs font-semibold">Preview Required</span>
                    </div>
                )}

                {filePath && isConfirmed && (
                    <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 animate-in fade-in">
                        <Check size={16} className="mr-1.5" />
                        <span className="text-xs font-semibold mr-3">Confirmed</span>

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

            {!filePath && !pendingFilePath && (
                <p className="text-xs text-slate-400 mt-1 pl-1">Supported format: PDF only</p>
            )}

            {pendingFilePath && !isConfirmed && (
                <p className="text-xs text-amber-600 mt-1 pl-1 font-medium">
                    ⚠️ Please preview and confirm the document before submitting
                </p>
            )}

            <PDFModal
                isOpen={showModal}
                onClose={pendingFilePath ? handleCancel : () => setShowModal(false)}
                fileUrl={modalFileUrl}
                onConfirm={pendingFilePath ? handleConfirm : null}
                isConfirmationMode={!!pendingFilePath}
            />
        </div>
    );
}
