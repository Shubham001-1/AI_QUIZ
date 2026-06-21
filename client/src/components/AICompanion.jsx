import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const QUICK_CHIPS = [
  { label: '✨ Generate 3 questions', prompt: 'Generate 3 creative quiz questions for my current topic.' },
  { label: '💡 Suggest a trick question', prompt: 'Suggest one clever trick question related to the quiz topic that would challenge even knowledgeable players.' },
  { label: '🎯 Improve last question', prompt: 'Help me improve the last question I wrote to be clearer, more engaging, and more challenging.' },
  { label: '⚡ Hard mode tips', prompt: 'Give me tips for writing hard, challenging quiz questions that are still fair.' },
];

const AICompanion = ({ isOpen, onClose, quizTopic, cellCount }) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hi! I'm your AI quiz companion ✨\n\nI can help you write questions, suggest improvements, or just brainstorm ideas for your quiz on **"${quizTopic || 'your topic'}"**.\n\nWhat would you like to do?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Update welcome message when topic changes
  useEffect(() => {
    if (quizTopic) {
      setMessages([{
        role: 'assistant',
        text: `Hi! I'm your AI quiz companion ✨\n\nI can help you write questions, suggest improvements, or just brainstorm ideas for your quiz on **"${quizTopic}"**.\n\nWhat would you like to do?`,
      }]);
    }
  }, [quizTopic]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setLoading(true);

    try {
      const context = quizTopic
        ? `Quiz topic: "${quizTopic}". Currently has ${cellCount} question(s) in the builder.`
        : '';

      const { data } = await axios.post(
        `${API_URL}/api/quiz/ai-assist`,
        { prompt, context },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply || 'No response received.' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `❌ ${err.response?.data?.message || 'Something went wrong. Please try again.'}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render markdown-lite: bold **text** and line breaks
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part.split('\n').map((line, j) => (
        <React.Fragment key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </React.Fragment>
      ));
    });
  };

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '360px' }}
      >
        {/* Glass background */}
        <div className="flex flex-col h-full bg-[#0f0b1e]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl shadow-brand-900/50">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-brand-900/60 to-purple-900/40 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-sm shadow-lg shadow-brand-500/30">
                ✨
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">AI Companion</p>
                <p className="text-white/40 text-xs">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm"
              title="Close AI Companion"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 mr-2 shadow shadow-brand-500/30">
                    ✨
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-600/80 text-white rounded-tr-sm'
                      : msg.isError
                      ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm'
                      : 'bg-white/10 border border-white/10 text-white/85 rounded-tl-sm'
                  }`}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 mr-2">
                  ✨
                </div>
                <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          <div className="px-3 py-2 border-t border-white/5 flex gap-1.5 flex-wrap flex-shrink-0">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.prompt)}
                disabled={loading}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:bg-white/15 hover:text-white hover:border-brand-500/40 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-4 pt-2 border-t border-white/10 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your quiz..."
                disabled={loading}
                rows={1}
                className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/20 resize-none transition-all leading-relaxed disabled:opacity-50"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center hover:from-brand-500 hover:to-brand-400 hover:shadow-lg hover:shadow-brand-500/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                title="Send (Enter)"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
            <p className="text-white/20 text-xs mt-1.5 text-center">Shift+Enter for new line · Enter to send</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AICompanion;
