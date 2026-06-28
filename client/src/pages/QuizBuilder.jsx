import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import AICompanion from '../components/AICompanion';
import Navbar from '../components/Navbar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

let cellIdCounter = 0;
const newCellId = () => `cell-${++cellIdCounter}`;

const makeBlankCell = () => ({
  id: newCellId(),
  questionText: '',
  options: ['', '', '', ''],
  correctOptionIndex: 0,
  points: 100,
  isGenerating: false,
  focused: false,
});

const QuizBuilder = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [cells, setCells] = useState([makeBlankCell()]);
  const [activeCellId, setActiveCellId] = useState(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Batch generation state
  const [batchCount, setBatchCount] = useState(5);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [quizId, setQuizId] = useState(null);
  const location = useLocation();

  // Load from state if editing
  useEffect(() => {
    if (location.state?.topic && location.state?.questions) {
      setTopic(location.state.topic);
      setQuizId(location.state.quizId || null);
      
      const loadedCells = location.state.questions.map((q) => ({
        id: newCellId(),
        questionText: q.questionText,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        points: q.points || 100,
        isGenerating: false,
        focused: false,
      }));
      setCells(loadedCells);
    }
  }, [location.state]);

  const notebookRef = useRef(null);

  // ── Cell CRUD ────────────────────────────────────────────────────────────────

  const updateCell = useCallback((id, patch) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const updateOption = useCallback((cellId, optIdx, value) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId
          ? { ...c, options: c.options.map((o, i) => (i === optIdx ? value : o)) }
          : c
      )
    );
  }, []);

  const insertCellAt = useCallback((index) => {
    const cell = makeBlankCell();
    setCells((prev) => {
      const next = [...prev];
      next.splice(index, 0, cell);
      return next;
    });
    setActiveCellId(cell.id);
    // Scroll to new cell after render
    setTimeout(() => {
      const el = document.getElementById(`cell-${cell.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  const deleteCell = useCallback((id) => {
    setCells((prev) => {
      if (prev.length === 1) return prev; // keep at least one
      return prev.filter((c) => c.id !== id);
    });
    setActiveCellId(null);
  }, []);

  const moveCell = useCallback((id, dir) => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  // ── AI: generate single cell ─────────────────────────────────────────────────

  const generateSingleCell = useCallback(
    async (cellId) => {
      if (!topic.trim()) {
        alert('Please set a quiz topic before generating with AI.');
        return;
      }
      updateCell(cellId, { isGenerating: true });
      try {
        const { data } = await axios.post(
          `${API_URL}/api/quiz/ai-cells`,
          { topic, difficulty, count: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.success && data.questions[0]) {
          const q = data.questions[0];
          updateCell(cellId, {
            questionText: q.questionText,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            points: q.points || 100,
            isGenerating: false,
          });
        }
      } catch (err) {
        alert(err.response?.data?.message || 'AI generation failed. Try again.');
        updateCell(cellId, { isGenerating: false });
      }
    },
    [topic, difficulty, token, updateCell]
  );

  // ── AI: batch generate ───────────────────────────────────────────────────────

  const handleBatchGenerate = async () => {
    if (!topic.trim()) {
      alert('Please set a quiz topic before generating.');
      return;
    }
    setBatchGenerating(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/quiz/ai-cells`,
        { topic, difficulty, count: batchCount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success && Array.isArray(data.questions)) {
        const newCells = data.questions.map((q) => ({
          id: newCellId(),
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          points: q.points || 100,
          isGenerating: false,
          focused: false,
        }));
        setCells((prev) => {
          // If only one blank cell exists, replace it; otherwise append
          if (prev.length === 1 && !prev[0].questionText.trim()) {
            return newCells;
          }
          return [...prev, ...newCells];
        });
        setTimeout(() => {
          notebookRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Batch generation failed. Try again.');
    } finally {
      setBatchGenerating(false);
    }
  };

  // ── Publish ──────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    setPublishError('');

    // Client-side validation
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (!c.questionText.trim()) {
        setPublishError(`Question ${i + 1} has no question text.`);
        document.getElementById(`cell-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (c.options.some((o) => !o.trim())) {
        setPublishError(`Question ${i + 1} has one or more empty options.`);
        document.getElementById(`cell-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    if (!topic.trim()) {
      setPublishError('Please set a quiz topic before publishing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        quizId,
        topic: topic.trim(),
        questions: cells.map((c) => ({
          questionText: c.questionText.trim(),
          options: c.options.map((o) => o.trim()),
          correctOptionIndex: c.correctOptionIndex,
          points: c.points,
        })),
      };

      const { data } = await axios.post(`${API_URL}/api/quiz/publish`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        // Navigate to host page carrying the room code + quiz metadata
        navigate('/host', {
          state: {
            fromBuilder: true,
            roomCode: data.roomCode,
            quizId: data.quizId,
            topic: topic.trim(),
            questions: cells,
          },
        });
      }
    } catch (err) {
      setPublishError(err.response?.data?.message || 'Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setPublishError('');

    // Client-side validation
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (!c.questionText.trim() || c.options.some((o) => !o.trim())) {
        setPublishError(`Please complete Question ${i + 1} before saving.`);
        document.getElementById(`cell-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    if (!topic.trim()) {
      setPublishError('Please set a quiz topic before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        quizId,
        topic: topic.trim(),
        questions: cells.map((c) => ({
          questionText: c.questionText.trim(),
          options: c.options.map((o) => o.trim()),
          correctOptionIndex: c.correctOptionIndex,
          points: c.points,
        })),
      };

      const { data } = await axios.post(`${API_URL}/api/quiz/save`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setQuizId(data.quizId); // update quizId so subsequent saves update the same quiz
        alert('Quiz saved successfully! You can find it in your dashboard.');
      }
    } catch (err) {
      setPublishError(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const completedCount = cells.filter(
    (c) => c.questionText.trim() && c.options.every((o) => o.trim())
  ).length;

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col" style={{ paddingRight: aiPanelOpen ? '360px' : '0', transition: 'padding-right 0.3s ease' }}>
      
      <Navbar />

      {/* ── Sticky Toolbar ── */}
      <div className="sticky top-16 z-30 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-border-subtle shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col gap-3">

          {/* Row 1: Topic + Difficulty — always full width */}
          <div className="flex gap-2 items-center">
            <input
              id="builder-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter quiz topic (e.g. Data Structures, World War II, Marvel Movies)..."
              maxLength={200}
              className="flex-1 bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-on-surface placeholder-on-surface-variant/50 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
            />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer flex-shrink-0 shadow-sm"
              style={{ backgroundImage: 'none' }}
            >
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Row 2: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Batch generate control */}
            <div className="flex items-center gap-1.5 bg-white border border-border-subtle rounded-xl px-3 py-1.5 flex-shrink-0 shadow-sm">
              <span className="text-on-surface-variant font-medium text-xs whitespace-nowrap">Generate</span>
              <input
                type="number"
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
                onBlur={() => {
                  const parsed = parseInt(batchCount, 10);
                  setBatchCount(isNaN(parsed) ? 5 : Math.max(1, Math.min(20, parsed)));
                }}
                min={1}
                max={20}
                className="w-10 bg-transparent text-primary font-bold text-sm text-center focus:outline-none font-mono"
              />
              <span className="text-on-surface-variant font-medium text-xs">cells</span>
            </div>

            <button
              id="batch-generate-btn"
              onClick={handleBatchGenerate}
              disabled={batchGenerating || !topic.trim()}
              className="flex items-center gap-1.5 bg-primary-container text-white text-sm font-label-bold px-4 py-2 rounded-xl hover:bg-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
            >
              {batchGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>✨ Generate {batchCount} Cells</>
              )}
            </button>

            <button
              onClick={() => insertCellAt(cells.length)}
              className="flex items-center gap-1.5 bg-surface-container border border-border-subtle text-on-surface text-sm font-label-bold px-3 py-2 rounded-xl hover:bg-surface-container-high transition-all duration-200 flex-shrink-0 shadow-sm"
            >
              + Add Cell
            </button>

            <div className="flex-1" />

            {/* Stats pill */}
            <div className="text-xs font-label-bold text-on-surface-variant whitespace-nowrap border border-border-subtle px-2 py-1 rounded-lg bg-surface-container">
              {completedCount}/{cells.length} ready
            </div>

            {/* AI toggle */}
            <button
              id="ai-companion-toggle"
              onClick={() => setAiPanelOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-sm font-label-bold px-3 py-2 rounded-xl border transition-all duration-200 flex-shrink-0 shadow-sm ${
                aiPanelOpen
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-white border-border-subtle text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
              }`}
            >
              ✨ AI Companion
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-grow max-w-4xl mx-auto px-4 py-8 pb-40 w-full relative z-10">

        {/* Hero header */}
        <div className="text-center mb-8">
          <h1 className="font-display-lg text-display-lg text-on-surface mb-2">
            Quiz Builder
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Build your quiz cell by cell — write manually, generate with AI, or mix both.
          </p>
        </div>

        {/* Cells */}
        <div ref={notebookRef} className="space-y-4">

          {/* First insert divider */}
          <InsertDivider onInsert={() => insertCellAt(0)} />

          {cells.map((cell, idx) => (
            <React.Fragment key={cell.id}>
              <QuestionCell
                cell={cell}
                index={idx}
                total={cells.length}
                isActive={activeCellId === cell.id}
                onFocus={() => setActiveCellId(cell.id)}
                onUpdateQuestion={(v) => updateCell(cell.id, { questionText: v })}
                onUpdateOption={(i, v) => updateOption(cell.id, i, v)}
                onSetCorrect={(i) => updateCell(cell.id, { correctOptionIndex: i })}
                onUpdatePoints={(v) => updateCell(cell.id, { points: v })}
                onMoveUp={() => moveCell(cell.id, -1)}
                onMoveDown={() => moveCell(cell.id, 1)}
                onDelete={() => deleteCell(cell.id)}
                onGenerateAI={() => generateSingleCell(cell.id)}
              />
              <InsertDivider onInsert={() => insertCellAt(idx + 1)} />
            </React.Fragment>
          ))}
        </div>

        {/* Publish section */}
        <div className="mt-12 bg-surface-container-lowest p-8 rounded-xl border border-border-subtle shadow-sm text-center">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Ready to host?</h2>
          <p className="text-on-surface-variant font-body-sm mb-6">
            {completedCount < cells.length
              ? `${cells.length - completedCount} question(s) still need text or options filled in.`
              : `All ${cells.length} questions are ready. Publish to get your room code!`}
          </p>

          {publishError && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl">
              <p className="text-error font-medium">{publishError}</p>
            </div>
          )}

          {cells.length < 3 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-800 font-medium">
                ⚠️ You have fewer than 3 questions. Consider adding more for a better experience.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving || cells.length === 0}
              className="bg-surface border border-border-subtle hover:bg-surface-container px-8 py-3.5 rounded-xl font-label-bold text-on-surface inline-flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>💾 Save Quiz</>
              )}
            </button>

            <button
              id="publish-quiz-btn"
              onClick={handlePublish}
              disabled={publishing || cells.length === 0}
              className="bg-primary-container text-white px-8 py-3.5 rounded-xl font-label-bold inline-flex items-center gap-2 disabled:opacity-50 hover:bg-primary transition-all shadow-md active:scale-95"
            >
              {publishing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>🚀 Host Now</>
              )}
            </button>
          </div>

          <p className="text-on-surface-variant/60 text-xs mt-4">
            "Host Now" will take you directly to the lobby where players can join. "Save Quiz" stores it for later.
          </p>
        </div>
      </div>

      {/* AI Companion */}
      <AICompanion
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        quizTopic={topic}
        cellCount={cells.length}
      />
    </div>
  );
};

// ── Question Cell ────────────────────────────────────────────────────────────

const QuestionCell = ({
  cell, index, total, isActive,
  onFocus, onUpdateQuestion, onUpdateOption, onSetCorrect, onUpdatePoints,
  onMoveUp, onMoveDown, onDelete, onGenerateAI,
}) => {
  const textareaRef = useRef(null);

  // Auto-resize question textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [cell.questionText]);

  return (
    <div
      id={`cell-${cell.id}`}
      onClick={onFocus}
      className={`relative rounded-xl border bg-surface-container-lowest transition-all duration-300 overflow-hidden ${
        isActive
          ? 'border-primary-container shadow-md'
          : 'border-border-subtle shadow-sm hover:border-primary-container/50'
      }`}
    >
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${
          isActive ? 'bg-primary-container' : 'bg-transparent'
        }`}
      />

      {/* Loading overlay */}
      {cell.isGenerating && (
        <div className="absolute inset-0 bg-surface-container-lowest/80 rounded-xl flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-primary">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-label-bold">Generating with AI...</span>
          </div>
        </div>
      )}

      <div className="p-4 md:p-5">
        {/* Cell header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-sm">psychology</span>
            </div>
            <span className="text-sm font-label-bold text-on-surface-variant tracking-wider uppercase">Question {index + 1}</span>
          </div>

          {/* Cell toolbar */}
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: isActive ? 1 : undefined }}>
            <CellToolbarBtn onClick={onMoveUp} disabled={index === 0} title="Move up" icon="arrow_upward" />
            <CellToolbarBtn onClick={onMoveDown} disabled={index === total - 1} title="Move down" icon="arrow_downward" />
            <CellToolbarBtn onClick={onGenerateAI} title="Generate with AI" accent icon="auto_awesome" />
            <CellToolbarBtn onClick={onDelete} disabled={total === 1} title="Delete cell" danger icon="delete" />
          </div>
        </div>

        {/* Question text */}
        <textarea
          ref={textareaRef}
          value={cell.questionText}
          onChange={(e) => onUpdateQuestion(e.target.value)}
          onFocus={onFocus}
          placeholder="Write your question here..."
          rows={2}
          className="w-full bg-transparent text-on-surface placeholder-on-surface-variant/40 font-headline-md text-headline-md resize-none focus:outline-none mb-3"
          style={{ minHeight: '48px' }}
        />

        {/* Options */}
        <div className="grid grid-cols-1 gap-2.5 mb-3">
          {cell.options.map((opt, i) => {
            const isCorrect = cell.correctOptionIndex === i;
            
            return (
              <div
                key={i}
                onClick={() => onSetCorrect(i)}
                className={`group relative flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all duration-200 option-button ${
                  isCorrect
                    ? 'border-2 border-primary-container bg-primary/5 shadow-md'
                    : 'border-border-subtle bg-white hover:border-primary-container hover:shadow-md'
                }`}
              >
                {/* Option label (A/B/C/D) */}
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-label-sm font-label-bold transition-all flex-shrink-0 ${
                  isCorrect
                    ? 'bg-primary-container text-white'
                    : 'border-2 border-border-subtle text-on-surface-variant group-hover:border-primary-container group-hover:text-primary-container'
                }`}>
                  {OPTION_LABELS[i]}
                </span>

                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdateOption(i, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={onFocus}
                  placeholder={`Option ${OPTION_LABELS[i]}...`}
                  className={`flex-1 bg-transparent placeholder-on-surface-variant/40 font-body-md focus:outline-none min-w-0 ${
                    isCorrect ? 'text-on-surface font-semibold' : 'text-on-surface'
                  }`}
                />
                
                {/* Checkmark for correct option */}
                {isCorrect && (
                  <span className="material-symbols-outlined text-primary-container flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer: points */}
        <div className="flex justify-end pt-3 border-t border-border-subtle mt-1">
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant font-label-bold text-sm">Points:</span>
            <input
              type="number"
              value={cell.points}
              onChange={(e) => onUpdatePoints(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(cell.points, 10);
                onUpdatePoints(isNaN(parsed) ? 100 : Math.max(10, Math.min(1000, parsed)));
              }}
              onClick={(e) => e.stopPropagation()}
              onFocus={onFocus}
              min={10}
              max={1000}
              step={10}
              className="w-20 bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-primary font-bold text-sm text-center focus:outline-none focus:border-primary shadow-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Cell toolbar button ──────────────────────────────────────────────────────

const CellToolbarBtn = ({ onClick, disabled, title, accent, danger, icon }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={disabled}
    title={title}
    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
      accent
        ? 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20'
        : danger
        ? 'bg-error/10 border border-error/20 text-error hover:bg-error/20'
        : 'bg-surface border border-border-subtle text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface shadow-sm'
    }`}
  >
    <span className="material-symbols-outlined text-[18px]">{icon}</span>
  </button>
);

// ── Insert divider ────────────────────────────────────────────────────────────

const InsertDivider = ({ onInsert }) => (
  <div className="group flex items-center gap-3 py-1 -my-2 relative z-0">
    <div className="flex-1 h-px bg-transparent group-hover:bg-primary/20 transition-all duration-200" />
    <button
      onClick={onInsert}
      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-label-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-full px-3 py-1 transition-all duration-200 whitespace-nowrap shadow-sm"
    >
      <span className="material-symbols-outlined text-[14px]">add</span>
      Insert Question
    </button>
    <div className="flex-1 h-px bg-transparent group-hover:bg-primary/20 transition-all duration-200" />
  </div>
);

export default QuizBuilder;
