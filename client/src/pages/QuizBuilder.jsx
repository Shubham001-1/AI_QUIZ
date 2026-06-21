import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import AICompanion from '../components/AICompanion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = [
  'from-red-600/80 to-red-700/80 border-red-500/40',
  'from-blue-600/80 to-blue-700/80 border-blue-500/40',
  'from-amber-600/80 to-amber-700/80 border-amber-500/40',
  'from-emerald-600/80 to-emerald-700/80 border-emerald-500/40',
];
const OPTION_COLORS_ACTIVE = [
  'from-red-500 to-red-600 border-red-400 ring-2 ring-red-400/40',
  'from-blue-500 to-blue-600 border-blue-400 ring-2 ring-blue-400/40',
  'from-amber-500 to-amber-600 border-amber-400 ring-2 ring-amber-400/40',
  'from-emerald-500 to-emerald-600 border-emerald-400 ring-2 ring-emerald-400/40',
];

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
  const [publishError, setPublishError] = useState('');

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

  // ── Render ───────────────────────────────────────────────────────────────────

  const completedCount = cells.filter(
    (c) => c.questionText.trim() && c.options.every((o) => o.trim())
  ).length;

  return (
    <div className="min-h-screen bg-[#0a0814] pt-16" style={{ paddingRight: aiPanelOpen ? '360px' : '0', transition: 'padding-right 0.3s ease' }}>

      {/* ── Sticky Toolbar ── */}
      <div className="sticky top-16 z-30 bg-[#0a0814]/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/40">
        <div className="max-w-4xl mx-auto px-4 py-2 flex flex-col gap-2">

          {/* Row 1: Topic + Difficulty — always full width */}
          <div className="flex gap-2 items-center">
            <input
              id="builder-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter quiz topic (e.g. Data Structures, World War II, Marvel Movies)..."
              maxLength={200}
              className="flex-1 bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 transition-all"
            />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-400 cursor-pointer flex-shrink-0"
              style={{ backgroundImage: 'none' }}
            >
              <option value="medium" className="bg-[#0a0814]">Medium</option>
              <option value="hard" className="bg-[#0a0814]">Hard</option>
            </select>
          </div>

          {/* Row 2: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Batch generate control */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 flex-shrink-0">
              <span className="text-white/50 text-xs whitespace-nowrap">Generate</span>
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
                className="w-8 bg-transparent text-white text-sm text-center focus:outline-none font-mono"
              />
              <span className="text-white/50 text-xs">cells</span>
            </div>

            <button
              id="batch-generate-btn"
              onClick={handleBatchGenerate}
              disabled={batchGenerating || !topic.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-700 to-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:from-purple-600 hover:to-brand-500 hover:shadow-lg hover:shadow-brand-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {batchGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>⚡ Generate {batchCount} Cells</>
              )}
            </button>

            <button
              onClick={() => insertCellAt(cells.length)}
              className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-white/20 transition-all duration-200 flex-shrink-0"
            >
              + Add Cell
            </button>

            <div className="flex-1" />

            {/* Stats pill */}
            <div className="text-xs text-white/40 whitespace-nowrap">
              {completedCount}/{cells.length} ready
            </div>

            {/* AI toggle */}
            <button
              id="ai-companion-toggle"
              onClick={() => setAiPanelOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border transition-all duration-200 flex-shrink-0 ${
                aiPanelOpen
                  ? 'bg-brand-600/30 border-brand-500/50 text-brand-300'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15 hover:text-white'
              }`}
            >
              ✨ AI
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-40 pt-8">

        {/* Hero header */}
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-3xl text-white mb-1">
            🧪 Quiz <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">Builder</span>
          </h1>
          <p className="text-white/40 text-sm">
            Build your quiz cell by cell — write manually, generate with AI, or mix both.
          </p>
        </div>

        {/* Cells */}
        <div ref={notebookRef} className="space-y-2">

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
        <div className="mt-10 glass-card p-6 text-center border border-white/10">
          <h2 className="font-display font-bold text-xl text-white mb-1">Ready to host?</h2>
          <p className="text-white/40 text-sm mb-5">
            {completedCount < cells.length
              ? `${cells.length - completedCount} question(s) still need text or options filled in.`
              : `All ${cells.length} questions are ready. Publish to get your room code!`}
          </p>

          {publishError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{publishError}</p>
            </div>
          )}

          {cells.length < 3 && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-amber-400 text-sm">
                ⚠️ You have fewer than 3 questions. Consider adding more for a better experience.
              </p>
            </div>
          )}

          <button
            id="publish-quiz-btn"
            onClick={handlePublish}
            disabled={publishing || cells.length === 0}
            className="btn-success px-10 py-4 text-base font-display font-bold inline-flex items-center gap-2 disabled:opacity-40"
          >
            {publishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>🚀 Publish Quiz &amp; Get Room Code</>
            )}
          </button>

          <p className="text-white/25 text-xs mt-3">
            You'll be taken to the lobby where players can join with your room code.
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
      className={`relative rounded-2xl border transition-all duration-200 ${
        isActive
          ? 'border-brand-500/60 bg-white/[0.06] shadow-lg shadow-brand-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
      }`}
    >
      {/* Left accent bar (Colab-style) */}
      <div
        className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-all duration-200 ${
          isActive ? 'bg-brand-400' : 'bg-transparent'
        }`}
      />

      {/* Loading overlay */}
      {cell.isGenerating && (
        <div className="absolute inset-0 bg-[#0a0814]/80 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-white/70">
            <div className="w-5 h-5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
            <span className="text-sm font-medium">Generating with AI...</span>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Cell header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/25 select-none">[ ]</span>
            <span className="text-xs text-white/30 font-medium">Q{index + 1}</span>
          </div>

          {/* Cell toolbar */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: isActive ? 1 : undefined }}>
            <CellToolbarBtn onClick={onMoveUp} disabled={index === 0} title="Move up">↑</CellToolbarBtn>
            <CellToolbarBtn onClick={onMoveDown} disabled={index === total - 1} title="Move down">↓</CellToolbarBtn>
            <CellToolbarBtn onClick={onGenerateAI} title="Generate with AI" accent>✨</CellToolbarBtn>
            <CellToolbarBtn onClick={onDelete} disabled={total === 1} title="Delete cell" danger>🗑</CellToolbarBtn>
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
          className="w-full bg-transparent text-white placeholder-white/25 text-base font-medium resize-none focus:outline-none leading-relaxed mb-4"
          style={{ minHeight: '52px' }}
        />

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {cell.options.map((opt, i) => (
            <div
              key={i}
              onClick={() => onSetCorrect(i)}
              className={`group relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 bg-gradient-to-r cursor-pointer transition-all duration-200 ${
                cell.correctOptionIndex === i
                  ? OPTION_COLORS_ACTIVE[i]
                  : OPTION_COLORS[i] + ' opacity-70 hover:opacity-90'
              }`}
            >
              {/* Option label */}
              <span className="text-xs font-black text-white/90 select-none w-5 text-center flex-shrink-0">
                {OPTION_LABELS[i]}
              </span>

              {/* Correct indicator */}
              <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                cell.correctOptionIndex === i
                  ? 'bg-white border-white'
                  : 'border-white/50 group-hover:border-white/80'
              }`}>
                {cell.correctOptionIndex === i && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </div>

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
                className="flex-1 bg-transparent text-white placeholder-white/40 text-sm focus:outline-none min-w-0"
              />
            </div>
          ))}
        </div>

        {/* Footer: correct answer hint + points */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Correct: <span className="text-emerald-400 font-semibold ml-0.5">{OPTION_LABELS[cell.correctOptionIndex]}</span>
            <span className="text-white/20">— click any option to change</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-white/30 text-xs">pts</span>
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
              className="w-16 bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-white text-xs text-center focus:outline-none focus:border-brand-400/60 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Cell toolbar button ──────────────────────────────────────────────────────

const CellToolbarBtn = ({ onClick, disabled, title, accent, danger, children }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={disabled}
    title={title}
    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed ${
      accent
        ? 'bg-brand-600/30 border border-brand-500/40 text-brand-300 hover:bg-brand-600/50'
        : danger
        ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/40'
        : 'bg-white/10 border border-white/15 text-white/60 hover:bg-white/15 hover:text-white'
    }`}
  >
    {children}
  </button>
);

// ── Insert divider ────────────────────────────────────────────────────────────

const InsertDivider = ({ onInsert }) => (
  <div className="group flex items-center gap-2 py-0.5">
    <div className="flex-1 h-px bg-white/0 group-hover:bg-white/10 transition-all duration-200" />
    <button
      onClick={onInsert}
      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 rounded-full px-2.5 py-0.5 transition-all duration-200 whitespace-nowrap"
    >
      + insert cell
    </button>
    <div className="flex-1 h-px bg-white/0 group-hover:bg-white/10 transition-all duration-200" />
  </div>
);

export default QuizBuilder;
