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
        return <strong key={i} className="text-on-surface font-semibold">{part.slice(2, -2)}</strong>;
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
        {/* Container */}
        <div className="flex flex-col h-full bg-surface-container-lowest border-l border-border-subtle shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm shadow-sm text-primary">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </div>
              <div>
                <p className="text-on-surface font-semibold text-sm leading-tight">AI Companion</p>
                <p className="text-on-surface-variant text-xs">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-surface border border-border-subtle hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all text-sm shadow-sm"
              title="Close AI Companion"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 bg-surface-container-lowest">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 mr-2 text-primary shadow-sm">
                    ✨
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary-container text-white rounded-tr-sm'
                      : msg.isError
                      ? 'bg-error-container text-on-error-container rounded-tl-sm border border-error/20'
                      : 'bg-surface-container-low border border-border-subtle text-on-surface rounded-tl-sm'
                  }`}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 mr-2 text-primary shadow-sm">
                  ✨
                </div>
                <div className="bg-surface-container-low border border-border-subtle rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center h-4">
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          <div className="px-4 py-3 border-t border-border-subtle bg-surface flex gap-2 flex-wrap flex-shrink-0">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.prompt)}
                disabled={loading}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-border-subtle text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:border-primary/40 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 pb-5 pt-3 bg-surface flex-shrink-0">
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
                className="flex-1 bg-surface-container-lowest border border-border-subtle rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none transition-all leading-relaxed disabled:opacity-50 shadow-sm"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl bg-primary-container text-white flex items-center justify-center hover:bg-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm active:scale-95"
                title="Send (Enter)"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
            <p className="text-on-surface-variant/60 font-medium text-[11px] mt-2 text-center">Shift+Enter for new line · Enter to send</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AICompanion;
