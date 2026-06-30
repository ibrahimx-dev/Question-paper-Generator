import { useState, useEffect, useMemo } from 'react';
import { Download, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const formatQuestionText = (text) => {
    if (!text) return '';
    let formatted = text.replace(/\\n/g, '\n');
    formatted = formatted.replace(/\s*\bOR\b\s*(B\))/gi, '\n\nOR\n\n$1');
    return formatted;
};

const cleanPartAText = (text) => {
    if (!text) return '';
    let cleaned = text;
    cleaned = cleaned.replace(/\s*[\(\[]\s*L[1-6]\s*[\)\]]/gi, '');
    cleaned = cleaned.replace(/^\s*L[1-6]\s*[-:.]\s*/i, '');
    cleaned = cleaned.replace(/\s*[\(\[]\s*\d+\s*marks?\s*[\)\]]/gi, '');
    return cleaned.trim();
};

function sectionKey(id) {
    return `PART_${String(id).toUpperCase()}`;
}

function buildSectionTitle(sec) {
    const marks = sec.marks_per_question ?? sec.marksPerQuestion ?? 5;
    const answerCount = sec.answer_count ?? sec.questionCount ?? 5;
    const total = marks * answerCount;
    const label = sec.label ?? `Part ${sec.id}`;
    return `${label.toUpperCase()} (${answerCount} × ${marks} = ${total} Marks)`;
}

function buildSectionSubtitle(sec) {
    const answerCount = sec.answer_count ?? sec.answerCount ?? sec.questionCount ?? 5;
    const questionCount = sec.question_count ?? sec.questionCount ?? answerCount;
    const qType = sec.question_type ?? sec.questionType ?? 'Short Answer';
    const answerAll = sec.answer_all ?? sec.answerAll ?? (answerCount >= questionCount);
    const answerLine = answerAll || answerCount >= questionCount
        ? 'Answer ALL questions'
        : `Answer any ${answerCount} questions`;
    return `${answerLine}. Questions are of ${qType.toLowerCase()} type.`;
}

export default function Preview() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState(null);
    const [subject, setSubject] = useState('Unknown');
    const [difficulty, setDifficulty] = useState('Unknown');
    const [examHeader, setExamHeader] = useState('University Examination');
    const [duration, setDuration] = useState('3 Hours');
    const [sectionConfig, setSectionConfig] = useState([]);

    useEffect(() => {
        const data = localStorage.getItem('generatedQuestions');
        const sub = localStorage.getItem('generatedSubject');
        const diff = localStorage.getItem('generatedDifficulty');
        const exHeader = localStorage.getItem('generatedExamHeader');
        const exDuration = localStorage.getItem('generatedDuration');
        const secs = localStorage.getItem('generatedSections');
        const secConfig = localStorage.getItem('generatedSectionConfig');

        if (data) {
            const parsed = JSON.parse(data);
            if (parsed.error) {
                alert(parsed.error);
                navigate('/generate');
                return;
            }
            setQuestions(parsed);
        }
        if (sub) setSubject(sub);
        if (diff) setDifficulty(diff);
        if (exHeader) setExamHeader(exHeader);
        if (exDuration) setDuration(exDuration);

        let config = [];
        if (secConfig) {
            try { config = JSON.parse(secConfig); } catch { /* ignore */ }
        }
        if (!config.length && secs) {
            try {
                const parsedSecs = JSON.parse(secs);
                config = parsedSecs.map((s) => ({
                    id: s.id,
                    label: s.label,
                    marks_per_question: s.marksPerQuestion ?? s.marks_per_question,
                    question_count: s.questionCount ?? s.question_count,
                    answer_count: s.answer_count ?? s.answerCount ?? s.questionCount,
                    answer_all: s.answer_all ?? s.answerAll ?? false,
                    question_type: s.question_type ?? s.questionType ?? 'Short Answer',
                }));
            } catch { /* ignore */ }
        }
        setSectionConfig(config);
    }, [navigate]);

    const totalMaxMarks = useMemo(() => {
        return sectionConfig.reduce((acc, sec) => {
            const marks = sec.marks_per_question ?? 5;
            const answerCount = sec.answer_count ?? sec.question_count ?? 0;
            return acc + marks * answerCount;
        }, 0);
    }, [sectionConfig]);

    const questionOffset = (sectionIndex) => {
        let offset = 0;
        for (let i = 0; i < sectionIndex; i++) {
            const sec = sectionConfig[i];
            const key = sectionKey(sec.id);
            offset += (questions?.[key]?.length ?? 0);
        }
        return offset;
    };

    const handleDownload = async () => {
        if (!questions) return;
        try {
            const sectionsForExport = sectionConfig.map((sec) => ({
                id: sec.id,
                label: sec.label,
                marks_per_question: sec.marks_per_question,
                answer_count: sec.answer_count,
                question_type: sec.question_type,
                title: buildSectionTitle(sec),
                subtitle: buildSectionSubtitle(sec),
                questions: questions[sectionKey(sec.id)] || [],
            }));

            const response = await axios.post(`${apiBaseUrl}/api/export`, {
                subject,
                difficulty,
                exam_header: examHeader,
                duration,
                max_marks: totalMaxMarks,
                sections: sectionsForExport,
                // Legacy fallback
                PART_A: questions.PART_A || [],
                PART_B: questions.PART_B || [],
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `question_paper_${subject}.pdf`);
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                if (link.parentNode) link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            alert('Failed to download PDF. Ensure backend is running.');
        }
    };

    const handleDeleteQuestion = (partKey, index) => {
        setQuestions((prev) => {
            const updated = { ...prev };
            updated[partKey] = [...(updated[partKey] || [])];
            updated[partKey].splice(index, 1);
            return updated;
        });
    };

    if (!questions) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <p className="mb-4">No paper generated yet.</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                >
                    Go to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const mods = localStorage.getItem('generatedModules');
                            navigate('/generate', {
                                state: {
                                    subjectName: subject,
                                    moduleNames: mods ? JSON.parse(mods) : [subject],
                                },
                            });
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 flex-shrink-0"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Preview Paper</h1>
                        <p className="text-xs sm:text-sm text-gray-500">Review and edit questions before downloading your PDF.</p>
                    </div>
                </div>
                <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    <Download size={18} /> Download PDF
                </button>
            </div>

            <div className="bg-white p-6 md:p-12 rounded-xl shadow-lg border border-gray-100 min-h-screen">
                <div className="text-center mb-10 border-b-2 border-gray-800 pb-6">
                    <h2 className="text-2xl font-bold uppercase tracking-wide">{examHeader}</h2>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-6 text-sm font-semibold">
                        <span>Subject: {subject}</span>
                        <span>Difficulty: {difficulty}</span>
                        <span>Time: {duration}</span>
                        <span>Max Marks: {totalMaxMarks}</span>
                    </div>
                </div>

                <div className="space-y-12 pl-4">
                    {sectionConfig.map((sec, secIdx) => {
                        const key = sectionKey(sec.id);
                        const sectionQuestions = questions[key] || [];
                        if (!sectionQuestions.length) return null;

                        const isShortSection = (sec.marks_per_question ?? 5) < 10;

                        return (
                            <div key={sec.id} className="space-y-6 pt-6 first:pt-0">
                                <h3 className="text-xl font-bold text-center underline underline-offset-4 mb-2">
                                    {buildSectionTitle(sec)}
                                </h3>
                                <p className="text-center text-sm italic text-gray-600 mb-8">
                                    {buildSectionSubtitle(sec)}
                                </p>
                                {sectionQuestions.map((q, idx) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="font-medium min-w-[30px]">
                                            {questionOffset(secIdx) + idx + 1}.
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-gray-800 break-words leading-relaxed whitespace-pre-wrap">
                                                {isShortSection
                                                    ? cleanPartAText(q.text || q)
                                                    : formatQuestionText(q.text || q)}
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 w-16">
                                            <button
                                                onClick={() => handleDeleteQuestion(key, idx)}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>

                <div className="text-center pt-12 mt-12 border-t border-dashed border-gray-300">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">*** End of Question Paper ***</p>
                </div>
            </div>
        </div>
    );
}
