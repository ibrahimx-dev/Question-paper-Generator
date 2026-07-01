import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Wand2, Loader2, Sparkles, BookOpen,
    PlusCircle, Trash2, Info
} from 'lucide-react';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const DIFFICULTY_META = {
    L1: { label: 'L1 – Remember',   color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    L2: { label: 'L2 – Understand', color: 'bg-teal-100    text-teal-700    border-teal-300'    },
    L3: { label: 'L3 – Apply',      color: 'bg-blue-100    text-blue-700    border-blue-300'    },
    L4: { label: 'L4 – Analyse',    color: 'bg-violet-100  text-violet-700  border-violet-300'  },
    L5: { label: 'L5 – Evaluate',   color: 'bg-orange-100  text-orange-700  border-orange-300'  },
    L6: { label: 'L6 – Create',     color: 'bg-rose-100    text-rose-700    border-rose-300'    },
};

const SHORT_TYPES = [
    'Short Answer',
    'Multiple Choice',
    'True / False',
    'Conceptual',
    'Fill in the Blanks',
];

const LONG_TYPES = [
    'Descriptive / Essay',
    'Design & Case Study',
    'Coding / Numerical',
    'Analytical',
];

function createSection(id, overrides = {}) {
    const isLong = id !== 'A';
    return {
        id,
        label: `Part ${id}`,
        marksPerQuestion: isLong ? 15 : 5,
        questionCount: isLong ? 5 : 8,
        answerCount: isLong ? 5 : 5,
        answerAll: isLong,
        questionType: isLong ? 'Descriptive / Essay' : 'Short Answer',
        ...overrides,
    };
}

const DEFAULT_SECTIONS = [
    createSection('A', { marksPerQuestion: 5, questionCount: 8, answerCount: 5, answerAll: false }),
    createSection('B', { marksPerQuestion: 15, questionCount: 5, answerCount: 5, answerAll: true }),
];

function num(val) {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : 0;
}

function questionTypesForSection(sec) {
    return num(sec.marksPerQuestion) >= 10 ? LONG_TYPES : SHORT_TYPES;
}

function NumberInput({ label, value, onChange, min = 1, max = 50 }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                {label}
            </label>
            <input
                type="number"
                min={min}
                max={max}
                required
                value={value === 0 ? 0 : value || ''}
                onChange={(e) => {
                    const raw = e.target.value;
                    onChange(raw === '' ? '' : parseInt(raw, 10));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                           transition-all"
            />
        </div>
    );
}

export default function Generator() {
    const navigate = useNavigate();
    const location = useLocation();

    const stateSubject = location.state?.subjectName;
    const stateModules = location.state?.moduleNames;
    const stateMaterialId = location.state?.material_id;
    const stateStoragePath = location.state?.storage_path;
    const hasContext = stateSubject && stateModules && stateModules.length > 0;

    const [sections, setSections] = useState(DEFAULT_SECTIONS);
    const [formData, setFormData] = useState({
        subject: stateSubject || '',
        modules: stateModules || [],
        difficulty: 'L1',
        examHeader: 'University Examination',
        duration: '3 Hours',
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const updateSection = (idx, field, val) => {
        setSections((prev) =>
            prev.map((s, i) => {
                if (i !== idx) return s;
                const updated = { ...s, [field]: val };

                if (field === 'questionCount') {
                    const qCount = num(val);
                    if (updated.answerAll) {
                        updated.answerCount = qCount;
                    } else if (num(updated.answerCount) > qCount) {
                        updated.answerCount = qCount;
                    }
                }

                if (field === 'marksPerQuestion') {
                    const types = questionTypesForSection(updated);
                    if (!types.includes(updated.questionType)) {
                        updated.questionType = types[0];
                    }
                }

                if (field === 'answerAll' && val === true) {
                    updated.answerCount = num(updated.questionCount);
                }

                return updated;
            })
        );
    };

    const addSection = () => {
        const nextId = String.fromCharCode(65 + sections.length);
        setSections((prev) => [
            ...prev,
            createSection(nextId, { marksPerQuestion: 10, questionCount: 5, answerCount: 5, answerAll: true }),
        ]);
    };

    const removeSection = (idx) => {
        if (sections.length <= 1) return;
        setSections((prev) => prev.filter((_, i) => i !== idx));
    };

    const totalMarks = sections.reduce(
        (acc, sec) => acc + num(sec.marksPerQuestion) * num(sec.answerCount),
        0
    );
    const totalQuestions = sections.reduce((acc, sec) => acc + num(sec.questionCount), 0);

    const handleGenerate = async (e) => {
        e.preventDefault();

        for (const sec of sections) {
            const qCount = num(sec.questionCount);
            const marks = num(sec.marksPerQuestion);
            const aCount = num(sec.answerCount);

            if (marks < 1) {
                alert(`${sec.label}: Marks per question must be at least 1.`);
                return;
            }
            if (qCount < 1) {
                alert(`${sec.label}: Number of questions must be at least 1.`);
                return;
            }
            if (aCount < 1) {
                alert(`${sec.label}: Questions to answer must be at least 1.`);
                return;
            }
            if (aCount > qCount) {
                alert(`${sec.label}: Questions to answer cannot exceed the number of generated questions (${qCount}).`);
                return;
            }
        }

        setIsGenerating(true);
        try {
            const sectionPayload = sections.map((sec) => ({
                id: sec.id,
                label: sec.label,
                marksPerQuestion: num(sec.marksPerQuestion),
                questionCount: num(sec.questionCount),
                answer_count: num(sec.answerCount),
                answer_all: sec.answerAll,
                question_type: sec.questionType,
            }));

            const payload = {
                subject: formData.subject,
                modules: formData.modules,
                difficulty: formData.difficulty,
                exam_header: formData.examHeader,
                duration: formData.duration,
                sections: sectionPayload,
                material_id: stateMaterialId || null,
                storage_path: stateStoragePath || null,
            };

            const response = await axios.post(`${apiBaseUrl}/api/generate`, payload);

            if (response.data.questions?.error) {
                alert(response.data.questions.error);
                return;
            }

            localStorage.setItem('generatedQuestions', JSON.stringify(response.data.questions));
            localStorage.setItem('generatedSubject', formData.subject);
            localStorage.setItem('generatedModules', JSON.stringify(formData.modules));
            localStorage.setItem('generatedDifficulty', response.data.difficulty);
            localStorage.setItem('generatedSections', JSON.stringify(sectionPayload));
            localStorage.setItem('generatedSectionConfig', JSON.stringify(response.data.section_config || sectionPayload));
            localStorage.setItem('generatedExamHeader', formData.examHeader);
            localStorage.setItem('generatedDuration', formData.duration);

            navigate('/preview');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || err.message;
            alert(msg || 'Failed to generate questions. Ensure backend is running and Groq API key is valid.');
        } finally {
            setIsGenerating(false);
        }
    };

    const canGenerate =
        !isGenerating &&
        formData.subject &&
        formData.modules.length > 0 &&
        sections.length > 0 &&
        sections.every((s) => num(s.marksPerQuestion) > 0 && num(s.questionCount) > 0 && num(s.answerCount) > 0);

    if (!hasContext) {
        return (
            <div className="max-w-xl mx-auto py-12">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center space-y-6">
                    <div className="inline-flex p-4 bg-amber-50 text-amber-600 rounded-2xl">
                        <BookOpen className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-gray-900">No Module Context Found</h2>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            To generate a question paper, you must first upload study materials for a specific module on the Dashboard.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-all"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-24 lg:pb-0">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shadow-sm">
                    <Sparkles className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Question Generator</h1>
                    <p className="text-sm text-gray-500">
                        Configure exam parameters, sections, difficulty, and generate your paper.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <form onSubmit={handleGenerate} className="space-y-7">
                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm border border-indigo-50">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
                                        Source Study Material Module
                                    </p>
                                    <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                                        {formData.modules[0]}
                                    </h2>
                                </div>
                            </div>
                            <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200 shadow-sm">
                                Locked Context
                            </span>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={16} className="text-indigo-500" /> General Exam Info
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        Exam Header
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.examHeader}
                                        onChange={(e) => setFormData({ ...formData, examHeader: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        Subject Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        Exam Duration
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider font-bold">
                                        Paper Sections
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Removed sections will not appear in the generated paper.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addSection}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    <PlusCircle className="h-4 w-4" />
                                    Add Section
                                </button>
                            </div>

                            <div className="space-y-4">
                                {sections.map((sec, idx) => {
                                    const sectionTotal = num(sec.marksPerQuestion) * num(sec.answerCount);
                                    const typeOptions = questionTypesForSection(sec);

                                    return (
                                        <div
                                            key={`${sec.id}-${idx}`}
                                            className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
                                        >
                                            {/* Section Header with badge, title and remove action */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200/60">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                                                        {sec.label.split(' ')[1] ?? sec.id}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-800">
                                                        {sec.label} Parameters
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-purple-50 text-purple-700 border border-purple-100 rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-sm text-[11px] font-bold">
                                                        <span>Total:</span>
                                                        <span className="text-sm font-extrabold">{sectionTotal}</span>
                                                        <span className="opacity-80">marks</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSection(idx)}
                                                        disabled={sections.length <= 1}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 hover:text-rose-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Remove section"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        <span>Remove</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inputs Row 1: Name, Marks, Questions Count */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                                        Section Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={sec.label}
                                                        onChange={(e) => updateSection(idx, 'label', e.target.value)}
                                                        maxLength={20}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all font-medium"
                                                    />
                                                </div>

                                                <NumberInput
                                                    label="Marks / Question"
                                                    value={sec.marksPerQuestion}
                                                    onChange={(v) => updateSection(idx, 'marksPerQuestion', v)}
                                                />

                                                <NumberInput
                                                    label="No. of Questions"
                                                    value={sec.questionCount}
                                                    onChange={(v) => updateSection(idx, 'questionCount', v)}
                                                />
                                            </div>

                                            {/* Inputs Row 2: Questions to Answer, Question Type */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                            Questions to Answer
                                                        </label>
                                                        <label className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold cursor-pointer select-none whitespace-nowrap">
                                                            <input
                                                                type="checkbox"
                                                                checked={sec.answerAll}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setSections((prev) =>
                                                                        prev.map((s, i) =>
                                                                            i !== idx
                                                                                ? s
                                                                                : {
                                                                                    ...s,
                                                                                    answerAll: checked,
                                                                                    answerCount: checked ? num(s.questionCount) : s.answerCount,
                                                                                }
                                                                        )
                                                                    );
                                                                }}
                                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3 cursor-pointer"
                                                            />
                                                            All Questions
                                                        </label>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={num(sec.questionCount) || 1}
                                                        required
                                                        disabled={sec.answerAll}
                                                        value={sec.answerCount === 0 ? 0 : sec.answerCount || ''}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            updateSection(idx, 'answerCount', raw === '' ? '' : parseInt(raw, 10));
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                                        Question Type
                                                    </label>
                                                    <select
                                                        required
                                                        value={sec.questionType}
                                                        onChange={(e) => updateSection(idx, 'questionType', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all cursor-pointer font-medium text-gray-700"
                                                    >
                                                        {typeOptions.map((t) => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-5 flex items-center justify-between bg-indigo-600 text-white rounded-xl px-5 py-3 shadow-md">
                                <div className="text-sm">
                                    <span className="opacity-70">Total Questions: </span>
                                    <span className="font-bold">{totalQuestions}</span>
                                </div>
                                <div className="w-px h-5 bg-white/30" />
                                <div className="text-sm">
                                    <span className="opacity-70">Total Marks: </span>
                                    <span className="font-bold text-lg">{totalMarks}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                                Difficulty Level
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                {Object.entries(DIFFICULTY_META).map(([lvl, meta]) => {
                                    const active = formData.difficulty === lvl;
                                    return (
                                        <label
                                            key={lvl}
                                            className={`flex flex-col items-center justify-center gap-1 py-3 px-2 border-2 rounded-xl cursor-pointer text-center transition-all select-none
                                                ${active ? `${meta.color} border-current shadow-sm scale-105` : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="difficulty"
                                                value={lvl}
                                                checked={active}
                                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                                className="hidden"
                                            />
                                            <span className="text-base font-bold leading-none">{lvl}</span>
                                            <span className="text-[9px] font-medium leading-tight opacity-80">
                                                {meta.label.split('–')[1]?.trim()}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-30 lg:static lg:p-0 lg:bg-transparent lg:border-none flex justify-end">
                            <button
                                type="submit"
                                disabled={!canGenerate}
                                className="w-full lg:w-auto relative overflow-hidden flex items-center justify-center gap-3 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 text-center"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Synthesizing Paper…
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={20} />
                                        Generate Paper
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="space-y-5">
                    <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
                        <h4 className="text-indigo-900 font-semibold mb-2 flex items-center gap-2 text-sm">
                            <Sparkles size={16} /> AI Guidelines
                        </h4>
                        <p className="text-xs text-indigo-800 leading-relaxed mb-3">
                            Only the sections listed below will be generated and printed. Remove a section to exclude it from the paper.
                        </p>
                        <ul className="text-xs text-indigo-700 space-y-1.5 list-disc pl-4">
                            <li>Section total = marks × questions to answer.</li>
                            <li>&quot;All Questions&quot; sets answer count equal to generated count.</li>
                            <li>Total marks is the sum of all active sections.</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                            <Info size={15} className="text-gray-400" /> Section Summary
                        </h4>
                        <div className="space-y-2">
                            {sections.map((sec) => (
                                <div key={sec.id} className="flex justify-between items-center text-xs text-gray-600">
                                    <span className="font-medium">{sec.label}</span>
                                    <span className="text-gray-400">
                                        {num(sec.answerCount)} × {num(sec.marksPerQuestion)}m =&nbsp;
                                        <span className="text-indigo-600 font-semibold">
                                            {num(sec.marksPerQuestion) * num(sec.answerCount)}
                                        </span>
                                    </span>
                                </div>
                            ))}
                            <div className="border-t border-gray-100 pt-2 flex justify-between text-xs font-bold text-gray-800">
                                <span>Total</span>
                                <span className="text-indigo-700">{totalMarks} marks</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Bloom&apos;s Levels</h4>
                        <div className="space-y-1.5">
                            {Object.entries(DIFFICULTY_META).map(([lvl, meta]) => (
                                <div key={lvl} className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${meta.color}`}>
                                    {meta.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
