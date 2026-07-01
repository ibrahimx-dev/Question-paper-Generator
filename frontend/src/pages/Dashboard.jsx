import { useState, useEffect, useRef } from "react";
import {
    X, Upload, CheckCircle2, AlertCircle,
    FileText, Wand2, UploadCloud, Loader2
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;



// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [modules, setModules] = useState([]);
    const [stats, setStats] = useState({ papers: 0, questions: 0 });
    const [recentLogs, setRecentLogs] = useState([]);
    
    // Form state

    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(""); // status message
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [dragging, setDragging] = useState(false);
    
    const fileRef = useRef();

    const fetchData = async () => {
        try {
            const [subsR, modsR, logsR] = await Promise.allSettled([
                axios.get(`${apiBaseUrl}/api/subjects`),
                axios.get(`${apiBaseUrl}/api/modules`),
                axios.get(`${apiBaseUrl}/api/analytics`),
            ]);

            const subs = subsR.status === "fulfilled" ? (subsR.value.data || []) : [];
            const mods = modsR.status === "fulfilled" ? (modsR.value.data || []) : [];
            const logsData = logsR.status === "fulfilled" ? (logsR.value.data || {}) : {};
            const logs = logsData.logs || [];
            const questionsCount = logsData.questions_count || 0;

            setSubjects(subs);
            setModules(mods);
            setStats({ papers: logs.length, questions: questionsCount });
            setRecentLogs(logs.slice(0, 4));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) setFile(dropped);
    };

    const handleUploadAndGenerate = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setSuccessMsg("");
        setErrorMsg("");
        
        const cleanModuleName = file.name.replace(/\.[^/.]+$/, '') || 'Untitled Module';
        
        try {
            // Step 1: Resolve Subject ID for "Default Subject"
            setUploadStatus("Resolving database containers...");
            let subjectId = "00000000-0000-0000-0000-000000000000";
            try {
                const existingSub = subjects.find(
                    (s) => s.name.toLowerCase() === "default subject"
                );

                if (existingSub) {
                    subjectId = existingSub.id;
                } else {
                    const resSub = await axios.post(`${apiBaseUrl}/api/subjects`, { name: "Default Subject" });
                    const newSub = Array.isArray(resSub.data) ? resSub.data[0] : resSub.data;
                    if (newSub && newSub.id) {
                        subjectId = newSub.id;
                    }
                }
            } catch (err) {
                console.warn("Silent fallback for subject creation:", err);
            }

            // Step 2: Resolve Module ID under "Default Subject"
            setUploadStatus("Resolving module container...");
            let moduleId = "00000000-0000-0000-0000-000000000000";
            try {
                const resModules = await axios.get(`${apiBaseUrl}/api/modules?subject_id=${subjectId}`);
                const currentMods = resModules.data || [];
                const existingMod = currentMods.find(
                    (m) => m.name.toLowerCase() === cleanModuleName.toLowerCase()
                );

                if (existingMod) {
                    moduleId = existingMod.id;
                } else {
                    const resMod = await axios.post(`${apiBaseUrl}/api/modules`, {
                        subject_id: subjectId,
                        name: cleanModuleName,
                    });
                    const newMod = Array.isArray(resMod.data) ? resMod.data[0] : resMod.data;
                    if (newMod && newMod.id) {
                        moduleId = newMod.id;
                    }
                }
            } catch (err) {
                console.warn("Silent fallback for module creation:", err);
            }

            // Step 3: Upload material
            setUploadStatus("Uploading & extracting text from document...");
            const fd = new FormData();
            fd.append("file", file);
            fd.append("subject_id", subjectId);
            fd.append("module_id", moduleId);

            const uploadRes = await axios.post(`${apiBaseUrl}/api/upload`, fd, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (uploadRes.data?.error) {
                throw new Error(uploadRes.data.error);
            }

            setSuccessMsg("Document processed successfully!");
            setFile(null);
            if (fileRef.current) fileRef.current.value = "";
            
            // Redirect to Generator screen with pre-selected default subject and module
            navigate("/generate", {
                state: {
                    subjectName: "Default Subject",
                    moduleNames: [cleanModuleName],
                    material_id: uploadRes.data?.material_id,
                    storage_path: uploadRes.data?.storage_path
                }
            });
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message || "An error occurred during upload/processing.");
        } finally {
            setUploading(false);
            setUploadStatus("");
        }
    };



    return (
        <div className="space-y-8 max-w-5xl mx-auto">


            {/* ── Centered simplified upload section ── */}
            <div className="max-w-xl mx-auto">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col p-5 sm:p-8">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
                            <UploadCloud className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Upload Study Material</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Upload your document and jump directly to paper generation.
                        </p>
                    </div>

                    <form onSubmit={handleUploadAndGenerate} className="space-y-5">
                        {/* Feedback banners */}
                        {successMsg && (
                            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
                                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                                <span>{successMsg}</span>
                                <button type="button" onClick={() => setSuccessMsg("")} className="ml-auto text-emerald-500 hover:text-emerald-700"><X size={14} /></button>
                            </div>
                        )}
                        {errorMsg && (
                            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <span>{errorMsg}</span>
                                <button type="button" onClick={() => setErrorMsg("")} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
                            </div>
                        )}



                        {/* Drop zone */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (!uploading) setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => !uploading && fileRef.current?.click()}
                            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-8 text-center
                                ${dragging || file ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50"}
                                ${uploading ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}`}
                        >
                            {file && !uploading && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        if (fileRef.current) fileRef.current.value = "";
                                    }}
                                    className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-white border border-gray-100 shadow-sm transition"
                                    title="Remove file"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            <input
                                ref={fileRef}
                                type="file"
                                className="hidden"
                                accept=".pdf,.docx"
                                onChange={(e) => setFile(e.target.files[0])}
                                disabled={uploading}
                            />
                            <div className="space-y-2">
                                <UploadCloud className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="text-sm text-gray-500">
                                    <span className="font-semibold text-indigo-600">
                                        {file ? "Change selected file" : "Click to upload"}
                                    </span>{" "}
                                    or drag & drop
                                </p>
                                <p className="text-xs text-gray-400">
                                    {file ? (
                                        <span className="text-indigo-600 font-semibold">
                                            {file.name} ({(file.size / 1024).toFixed(1)} KB) ready ✓
                                        </span>
                                    ) : (
                                        "PDF or DOCX · up to 10 MB"
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={!file || uploading}
                                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                        <span>{uploadStatus}</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={16} />
                                        <span>Process &amp; Generate Paper</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ── Recent generations strip ── */}
            {recentLogs.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-xl mx-auto">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-indigo-500" />
                            <h2 className="text-base font-bold text-gray-900">Recent Generations</h2>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentLogs.map((log, i) => (
                            <div key={log.id || i} className="flex items-center justify-between px-6 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-emerald-50 rounded-lg">
                                        <FileText size={14} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Paper #{i + 1}</p>
                                        <p className="text-xs text-gray-400">
                                            {(log.five_mark_count || 0) + (log.fifteen_mark_count || 0)} questions generated
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                                    Success
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
