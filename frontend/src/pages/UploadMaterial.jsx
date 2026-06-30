import { useState, useEffect } from 'react';
import { Upload, FileType2, CheckCircle2, X } from 'lucide-react';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export default function UploadMaterial() {
    const [file, setFile] = useState(null);
    const [subject, setSubject] = useState("");
    const [subjects, setSubjects] = useState([]);
    const [modules, setModules] = useState([]);
    const [moduleId, setModuleId] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        axios.get(`${apiBaseUrl}/api/subjects`).then(res => {
            setSubjects(res.data || []);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (!subject) {
            setModules([]);
            setModuleId("");
            return;
        }
        axios.get(`${apiBaseUrl}/api/modules?subject_id=${subject}`).then(res => {
            setModules(res.data || []);
            setModuleId("");
        }).catch(() => { });
    }, [subject]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !subject || !moduleId) return;

        setIsUploading(true);
        setErrorMsg("");
        setSuccessMsg("");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("subject_id", subject);
        formData.append("module_id", moduleId);

        try {
            const resp = await axios.post(`${apiBaseUrl}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSuccessMsg(`${resp.data.info} (${resp.data.total_characters} characters extracted)`);
            setFile(null);
        } catch (err) {
            setErrorMsg("Failed to upload file. Please ensure backend is running.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-900">Upload Study Material</h1>
                <p className="text-sm text-gray-500 mt-1">Upload syllabus and notes (PDF/DOCX) for a specific module</p>
            </div>

            <form onSubmit={handleUpload} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6 flex flex-col items-center sm:items-stretch">

                {successMsg && (
                    <div className="w-full bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={18} /> {successMsg}
                    </div>
                )}

                {errorMsg && (
                    <div className="w-full bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
                        <X size={18} /> {errorMsg}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                        <select
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">-- Choose Subject --</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Module</label>
                        <select
                            required
                            disabled={!subject || modules.length === 0}
                            value={moduleId}
                            onChange={(e) => setModuleId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            <option value="">-- Choose Module --</option>
                            {modules.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        {subject && modules.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">No modules found. Please create modules in Subjects first.</p>
                        )}
                    </div>
                </div>

                <div className="w-full flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-400 transition-colors bg-gray-50 hover:bg-indigo-50 cursor-pointer">
                    <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 justify-center">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 p-1 px-2">
                                <span>Upload a file</span>
                                <input
                                    type="file"
                                    className="sr-only"
                                    accept=".pdf,.docx"
                                    onChange={(e) => setFile(e.target.files[0])}
                                />
                            </label>
                            <p className="pl-1 pt-1 opacity-70">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PDF or DOCX up to 10MB</p>
                    </div>
                </div>

                {file && (
                    <div className="w-full flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <FileType2 className="text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700 flex-1 truncate">{file.name}</span>
                        <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500"><X size={18} /></button>
                    </div>
                )}

                <div className="w-full flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={!file || !subject || !moduleId || isUploading}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 transition-all shadow-sm"
                    >
                        {isUploading ? 'Extracting & Saving...' : 'Process Document'}
                        <Upload size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
}
