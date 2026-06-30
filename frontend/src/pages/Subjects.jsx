import { useState, useEffect } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export default function Subjects() {
    const [subjects, setSubjects] = useState([]);
    const [modules, setModules] = useState({});
    const [newSubject, setNewSubject] = useState("");
    const [showAddSubject, setShowAddSubject] = useState(false);
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [newModuleName, setNewModuleName] = useState("");

    const fetchSubjects = async () => {
        try {
            const res = await axios.get(`${apiBaseUrl}/api/subjects`);
            setSubjects(res.data || []);
        } catch (err) {
            console.error("Failed to fetch subjects");
        }
    };

    const fetchModules = async (subjectId) => {
        try {
            const res = await axios.get(`${apiBaseUrl}/api/modules?subject_id=${subjectId}`);
            setModules(prev => ({ ...prev, [subjectId]: res.data || [] }));
        } catch (err) {
            console.error("Failed to fetch modules");
        }
    };

    useEffect(() => { fetchSubjects(); }, []);

    const handleAddSubject = async () => {
        if (!newSubject.trim()) return;
        try {
            await axios.post(`${apiBaseUrl}/api/subjects`, { name: newSubject.trim() });
            setNewSubject("");
            setShowAddSubject(false);
            fetchSubjects();
        } catch (err) {
            alert("Failed to add subject");
        }
    };

    const handleDeleteSubject = async (id) => {
        if (!window.confirm("Delete this subject and all its modules?")) return;
        try {
            await axios.delete(`${apiBaseUrl}/api/subjects/${id}`);
            fetchSubjects();
        } catch (err) {
            alert("Failed to delete subject");
        }
    };

    const handleAddModule = async (subjectId) => {
        if (!newModuleName.trim()) return;
        try {
            await axios.post(`${apiBaseUrl}/api/modules`, { subject_id: subjectId, name: newModuleName.trim() });
            setNewModuleName("");
            fetchModules(subjectId);
        } catch (err) {
            alert("Failed to add module");
        }
    };

    const handleDeleteModule = async (moduleId, subjectId) => {
        try {
            await axios.delete(`${apiBaseUrl}/api/modules/${moduleId}`);
            fetchModules(subjectId);
        } catch (err) {
            alert("Failed to delete module");
        }
    };

    const toggleExpand = (id) => {
        if (expandedSubject === id) {
            setExpandedSubject(null);
        } else {
            setExpandedSubject(id);
            if (!modules[id]) fetchModules(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subjects & Modules</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage academic subjects and their modules</p>
                </div>
                <button
                    onClick={() => setShowAddSubject(!showAddSubject)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                    <Plus size={18} /> Add Subject
                </button>
            </div>

            {/* Add Subject Form */}
            {showAddSubject && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3">
                    <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Enter subject name..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                    />
                    <button onClick={handleAddSubject} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Save</button>
                    <button onClick={() => setShowAddSubject(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
            )}

            {/* Subject List */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                {subjects.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-12">No subjects yet. Add one to get started!</p>
                )}
                <ul className="divide-y divide-gray-200">
                    {subjects.map((subject) => (
                        <li key={subject.id}>
                            <div className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-center justify-between">
                                    <button onClick={() => toggleExpand(subject.id)} className="flex items-center gap-3 text-left flex-1">
                                        {expandedSubject === subject.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">{subject.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{modules[subject.id]?.length || 0} modules</p>
                                        </div>
                                    </button>
                                    <button onClick={() => handleDeleteSubject(subject.id)} className="text-red-500 hover:text-red-700 p-1">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Module Section */}
                            {expandedSubject === subject.id && (
                                <div className="px-6 pb-6 bg-gray-50 border-t border-gray-100">
                                    <div className="mt-4 space-y-2">
                                        {(modules[subject.id] || []).map((mod) => (
                                            <div key={mod.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                                <span className="text-sm text-gray-700">{mod.name}</span>
                                                <button onClick={() => handleDeleteModule(mod.id, subject.id)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={newModuleName}
                                            onChange={(e) => setNewModuleName(e.target.value)}
                                            placeholder="New module name..."
                                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                                            onKeyDown={(e) => e.key === "Enter" && handleAddModule(subject.id)}
                                        />
                                        <button onClick={() => handleAddModule(subject.id)} className="bg-indigo-500 text-white px-3 py-2 text-sm rounded-lg hover:bg-indigo-600">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
