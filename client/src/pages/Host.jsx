import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import useSocket from '../hooks/useSocket';
import PlayerList from '../components/PlayerList';
import LiveLeaderboard from '../components/LiveLeaderboard';
import QuestionCard from '../components/QuestionCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GAME_PHASES = {
  SETUP: 'setup',
  GENERATING: 'generating',
  LOBBY: 'lobby',
  ACTIVE: 'active',
  BETWEEN: 'between',
  FINISHED: 'finished',
};

const Host = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, on, off, emit, removeAllListeners } = useSocket();

  const [phase, setPhase] = useState(GAME_PHASES.SETUP);
  const [topic, setTopic] = useState('');
  const [topicError, setTopicError] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [roomCode, setRoomCode] = useState('');
  const [quizId, setQuizId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState('');
  const [startError, setStartError] = useState('');
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [quizStats, setQuizStats] = useState([]);
  const [showPlayersList, setShowPlayersList] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [pastQuizzes, setPastQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' or 'history'
  const [fetchingSaved, setFetchingSaved] = useState(false);
  
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const fetchSavedQuizzes = useCallback(async () => {
    if (!user?.id) return;
    setFetchingSaved(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/quiz/history/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setSavedQuizzes(data.quizzes.filter((q) => q.status === 'saved'));
        setPastQuizzes(data.quizzes.filter((q) => q.status === 'finished'));
      }
    } catch (err) {
      console.error('Failed to fetch saved quizzes', err);
    } finally {
      setFetchingSaved(false);
    }
  }, [user?.id, token]);

  // Fetch saved quizzes on mount and when phase resets to SETUP
  useEffect(() => {
    if (phase === GAME_PHASES.SETUP) {
      fetchSavedQuizzes();
    }
  }, [phase, fetchSavedQuizzes]);

  // Bootstrap from Quiz Builder publish
  useEffect(() => {
    const state = location.state;
    if (state?.fromBuilder && state?.roomCode) {
      setRoomCode(state.roomCode);
      setQuizId(state.quizId || '');
      setTopic(state.topic || 'Custom Quiz');
      setQuestions(state.questions || []);
      setPhase(GAME_PHASES.LOBBY);
      // Clear location state to avoid re-triggering on refresh
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register socket listeners
  useEffect(() => {
    const handleRoomJoined = ({ roomCode: rc, players: p, allStats }) => {
      setPlayers(p || []);
      if (allStats) {
        setQuizStats(allStats);
      }
    };

    const handlePlayerJoined = ({ players: p }) => {
      setPlayers(p || []);
    };

    const handleGameStarted = () => {
      setPhase(GAME_PHASES.ACTIVE);
    };

    const handleNewQuestion = ({ question, questionIndex: qi, totalQuestions: tq }) => {
      setCurrentQuestion(question);
      setQuestionIndex(qi);
      setTotalQuestions(tq);
      setTimeUp(false);
      setCorrectOptionIndex(null);
      setPhase(GAME_PHASES.ACTIVE);
    };

    const handleTimeUp = ({ correctOptionIndex: coi, allStats }) => {
      setTimeUp(true);
      setCorrectOptionIndex(coi);
      if (allStats) {
        setQuizStats(allStats);
      }
      setPhase(GAME_PHASES.BETWEEN);
    };

    const handleLeaderboardUpdate = ({ leaderboard: lb }) => {
      setLeaderboard(lb || []);
    };

    const handleGameOver = ({ finalLeaderboard: fl }) => {
      setFinalLeaderboard(fl || []);
      setPhase(GAME_PHASES.FINISHED);
      navigate('/leaderboard', { state: { finalLeaderboard: fl, isHost: true } });
    };

    const handleError = ({ message }) => {
      setStartError(message);
      setTimeout(() => setStartError(''), 5000);
    };

    on('ROOM_JOINED', handleRoomJoined);
    on('PLAYER_JOINED', handlePlayerJoined);
    on('GAME_STARTED', handleGameStarted);
    on('NEW_QUESTION', handleNewQuestion);
    on('TIME_UP', handleTimeUp);
    on('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
    on('GAME_OVER', handleGameOver);
    on('ERROR', handleError);

    return () => {
      off('ROOM_JOINED', handleRoomJoined);
      off('PLAYER_JOINED', handlePlayerJoined);
      off('GAME_STARTED', handleGameStarted);
      off('NEW_QUESTION', handleNewQuestion);
      off('TIME_UP', handleTimeUp);
      off('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
      off('GAME_OVER', handleGameOver);
      off('ERROR', handleError);
    };
  }, [on, off, navigate]);

  // Join room when roomCode is set — guarded to only fire once per roomCode
  const joinedRoomRef = React.useRef(null);
  useEffect(() => {
    if (roomCode && isConnected && user && joinedRoomRef.current !== roomCode) {
      joinedRoomRef.current = roomCode;
      emit('HOST_JOIN_ROOM', { roomCode, userId: user.id, userName: user.name });
    }
  }, [roomCode, isConnected, user, emit]);

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setTopicError('Please enter a topic.');
      return;
    }
    setTopicError('');
    setError('');
    setPhase(GAME_PHASES.GENERATING);

    try {
      const { data } = await axios.post(
        `${API_URL}/api/quiz/generate`,
        { topic: topic.trim(), difficulty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setRoomCode(data.roomCode);
        setQuizId(data.quizId);
        setQuestions(data.questions);
        setPhase(GAME_PHASES.LOBBY);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate quiz. Please try again.');
      setPhase(GAME_PHASES.SETUP);
    }
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleStartGame = () => {
    if (players.length === 0) {
      setStartError('You need at least one player to start!');
      setTimeout(() => setStartError(''), 3000);
      return;
    }
    emit('START_GAME', { roomCode });
  };

  const handleNextQuestion = () => {
    emit('NEXT_QUESTION', { roomCode });
    setTimeUp(false);
    setCorrectOptionIndex(null);
  };

  const handleEndGame = () => {
    emit('END_GAME', { roomCode });
  };

  const handleReset = () => {
    setPhase(GAME_PHASES.SETUP);
    setTopic('');
    setDifficulty('medium');
    setRoomCode('');
    setQuizId('');
    setQuestions([]);
    setPlayers([]);
    setLeaderboard([]);
    setQuizStats([]);
    setCurrentQuestion(null);
    setQuestionIndex(-1);
    setError('');
    setShowAIGenerator(false);
    removeAllListeners();
  };

  const handleHostSaved = async (quizId) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/quiz/host-saved`,
        { quizId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setRoomCode(data.roomCode);
        setQuizId(data.quizId);
        setTopic(data.topic);
        setQuestions(data.questions);
        setPhase(GAME_PHASES.LOBBY);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to host saved quiz.');
    }
  };

  const handleEditSaved = (quiz) => {
    // Navigate to builder, passing the quiz data in state
    axios.get(`${API_URL}/api/quiz/${quiz.roomCode}`)
      .then(({ data }) => {
        if (data.success) {
          navigate('/builder', {
            state: {
              quizId: data.quiz._id,
              topic: data.quiz.topic,
              questions: data.quiz.questions,
            }
          });
        }
      })
      .catch((err) => {
        alert('Failed to load quiz details for editing.');
      });
  };

  const handleDeleteSaved = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this saved quiz?')) return;
    try {
      const { data } = await axios.delete(`${API_URL}/api/quiz/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        fetchSavedQuizzes();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete saved quiz.');
    }
  };

  // Common Header mapped to light theme for all phases
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const HeaderNav = () => (
    <header className="w-full sticky top-0 z-50 bg-surface-container-lowest border-b border-border-subtle shadow-sm">
      <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-16 sm:h-20">
        <div className="flex items-center gap-6">
          <a href="/" className="font-headline-lg text-headline-lg font-bold text-primary">QuizMaster</a>
          <div className="hidden lg:flex items-center gap-6">
            <a href="/" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Home</a>
            <a href="/builder" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Create Quiz</a>
            <div className="relative">
              <a href="/host" className="font-body-md text-body-md text-primary transition-colors">Host Quiz</a>
              <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-primary"></div>
            </div>
            <a href="/play" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Join Quiz</a>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-4">
          <span className="font-body-md font-bold text-on-surface-variant">
            {user ? user.name : 'Host'}
          </span>
        </div>
        <button
          className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
          onClick={() => setMobileMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </nav>
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border-subtle bg-surface-container-lowest px-4 pb-4 space-y-1 shadow-md">
          <a href="/" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">Home</a>
          <a href="/builder" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">Create Quiz</a>
          <a href="/host" className="block px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10">Host Quiz</a>
          <a href="/play" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">Join Quiz</a>
          <div className="pt-3 border-t border-border-subtle">
            <span className="block px-4 py-2 text-sm font-bold text-on-surface-variant">{user ? user.name : 'Host'}</span>
          </div>
        </div>
      )}
    </header>
  );

  // SETUP Phase
  if (phase === GAME_PHASES.SETUP || phase === GAME_PHASES.GENERATING) {
    return (
      <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
        <HeaderNav />
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 flex-grow w-full animate-slide-up">
          <section className="mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-4xl lg:text-display-lg font-display-lg font-bold text-on-surface mb-2">Host & Manage Your Quizzes</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-sm sm:text-base">Create high-impact assessments with AI-powered questions or build custom challenges from scratch to engage your learners.</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {!showAIGenerator ? (
              <div 
                onClick={() => setShowAIGenerator(true)}
                className="group relative bg-primary-container p-8 rounded-xl border border-primary text-white overflow-hidden cursor-pointer transition-all hover:shadow-lg shadow-sm"
              >
                <div className="relative z-10">
                  <span className="material-symbols-outlined text-4xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <h3 className="font-headline-lg text-headline-lg mb-2 text-white">Generate with AI</h3>
                  <p className="font-body-sm text-body-sm text-white/90 mb-6 max-w-sm">Create a full 20-question certification quiz from just a topic in seconds.</p>
                  <button className="bg-white text-primary px-4 py-2 rounded-lg font-label-bold group-hover:scale-105 transition-transform shadow-sm">Get Started</button>
                </div>
                <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:opacity-20 transition-opacity text-white">
                  <span className="material-symbols-outlined text-[120px]">psychology</span>
                </div>
              </div>
            ) : (
              <div className="bg-primary-container p-8 rounded-xl border border-primary text-white shadow-lg relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowAIGenerator(false); setTopicError(''); setError(''); }}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
                <h3 className="font-headline-lg text-headline-lg mb-2 text-white flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  Generate with AI
                </h3>
                <form onSubmit={handleGenerateQuiz} className="mt-4 relative z-10">
                  <div className="mb-4">
                    <label className="block text-white/90 text-sm font-label-bold mb-2">Quiz Topic</label>
                    <input 
                      type="text" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Intro to LLMs & Prompt Engineering"
                      className="w-full bg-white text-on-surface border border-transparent rounded-lg py-3 px-4 focus:ring-2 focus:ring-white outline-none placeholder:text-on-surface-variant/40"
                      disabled={phase === GAME_PHASES.GENERATING}
                      autoFocus
                    />
                    {topicError && <p className="text-error-container text-sm mt-1 font-medium">{topicError}</p>}
                  </div>
                  <button 
                    type="submit" 
                    disabled={phase === GAME_PHASES.GENERATING}
                    className="w-full bg-white text-primary px-4 py-3 rounded-lg font-label-bold flex items-center justify-center gap-2 hover:bg-surface-container-lowest transition-colors disabled:opacity-80 disabled:cursor-not-allowed shadow-sm"
                  >
                    {phase === GAME_PHASES.GENERATING ? (
                      <><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> Generating AI Quiz...</>
                    ) : '✨ Generate 10 Questions'}
                  </button>
                </form>
                {error && <p className="text-error-container text-sm mt-4 text-center font-medium bg-error/20 p-2 rounded-lg">{error}</p>}
              </div>
            )}

            <div 
              onClick={() => navigate('/builder')}
              className="group relative bg-surface-container-lowest p-8 rounded-xl border border-border-subtle cursor-pointer transition-all hover:border-primary hover:shadow-sm"
            >
              <span className="material-symbols-outlined text-4xl mb-4 text-primary">edit_note</span>
              <h3 className="font-headline-lg text-headline-lg mb-2 text-on-surface">Build Manually</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 max-w-sm">Fine-tune every detail. Best for specific corporate training and niche topics.</p>
              <button className="border border-border-subtle text-on-surface-variant px-4 py-2 rounded-lg font-label-bold group-hover:text-primary group-hover:border-primary transition-colors shadow-sm bg-surface-container-lowest">Start Building</button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle overflow-hidden mt-gutter shadow-sm">
            <div className="px-8 py-6 border-b border-border-subtle flex items-center gap-6 bg-surface-container-lowest">
              <button
                onClick={() => setActiveTab('saved')}
                className={`font-headline-md text-headline-md pb-1 transition-colors ${activeTab === 'saved' ? 'text-on-surface border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Saved Templates
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`font-headline-md text-headline-md pb-1 transition-colors ${activeTab === 'history' ? 'text-on-surface border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Past Games
              </button>
            </div>
            
            <div className="divide-y divide-border-subtle bg-surface-container-lowest">
              {fetchingSaved ? (
                <div className="p-12 text-center text-on-surface-variant">
                   <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                   <p className="font-medium">Loading your quizzes...</p>
                </div>
              ) : activeTab === 'saved' ? (
                 savedQuizzes.length === 0 ? (
                    <div className="p-12 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl mb-3 opacity-30">bookmark_border</span>
                      <p className="font-medium">No saved templates yet.</p>
                      <p className="text-sm mt-1 opacity-70">Build or generate a quiz to see it here.</p>
                    </div>
                 ) : (
                   savedQuizzes.map((quiz) => (
                      <div key={quiz._id} className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-low transition-colors">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex flex-shrink-0 items-center justify-center text-primary">
                            <span className="material-symbols-outlined">terminal</span>
                          </div>
                          <div>
                            <h4 className="font-body-lg text-body-lg font-semibold text-on-surface truncate max-w-sm md:max-w-md lg:max-w-xl">{quiz.topic}</h4>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="inline-flex items-center gap-1 bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded text-xs font-label-bold uppercase tracking-wider">Saved</span>
                              <span className="text-body-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">format_list_bulleted</span> {quiz.questionCount} Questions</span>
                              <span className="text-body-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">event</span> {new Date(quiz.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button onClick={() => handleHostSaved(quiz._id)} className="bg-primary-container text-white px-4 py-2 rounded font-label-bold hover:opacity-90 transition-opacity shadow-sm">Host Now</button>
                          <button onClick={() => handleEditSaved(quiz)} className="p-2 bg-surface-container-lowest border border-border-subtle text-on-surface-variant hover:bg-surface hover:text-primary rounded transition-colors shadow-sm" title="Edit"><span className="material-symbols-outlined">edit</span></button>
                          <button onClick={() => handleDeleteSaved(quiz._id)} className="p-2 bg-surface-container-lowest border border-border-subtle text-error hover:bg-error/10 hover:border-error/30 rounded transition-colors shadow-sm" title="Delete"><span className="material-symbols-outlined">delete</span></button>
                        </div>
                      </div>
                   ))
                 )
              ) : (
                pastQuizzes.length === 0 ? (
                    <div className="p-12 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl mb-3 opacity-30">history</span>
                      <p className="font-medium">No past games yet.</p>
                      <p className="text-sm mt-1 opacity-70">Host a game to completion to see your history.</p>
                    </div>
                ) : (
                  pastQuizzes.map((quiz) => (
                    <div key={quiz._id} className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-low transition-colors">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-surface-container-high rounded-lg flex flex-shrink-0 items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined">database</span>
                        </div>
                        <div>
                          <h4 className="font-body-lg text-body-lg font-semibold text-on-surface truncate max-w-sm md:max-w-md lg:max-w-xl">{quiz.topic}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="inline-flex items-center gap-1 bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded text-xs font-label-bold uppercase tracking-wider">Completed</span>
                            <span className="text-body-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">groups</span> {quiz.finalLeaderboard?.length || 0} Participants</span>
                            <span className="text-body-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-sm">event</span> {new Date(quiz.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button onClick={() => navigate('/leaderboard', { state: { finalLeaderboard: quiz.finalLeaderboard, isHost: true } })} className="bg-surface border border-border-subtle text-on-surface px-4 py-2 rounded font-label-bold hover:bg-surface-container transition-colors shadow-sm">View Results</button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
          
          {/* Connection status */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-on-surface-variant">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary-container pulse-dot' : 'bg-error'}`} />
            {isConnected ? 'Connected to server' : 'Connecting to server...'}
          </div>
        </main>
      </div>
    );
  }

  // LOBBY Phase
  if (phase === GAME_PHASES.LOBBY) {
    return (
      <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
        <HeaderNav />
        <main className="flex-grow flex items-center justify-center px-4 py-8 sm:py-12">
          <div className="max-w-4xl w-full">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-10 animate-slide-down">
              <h1 className="text-2xl sm:text-4xl lg:text-display-lg font-display-lg font-bold text-on-surface mb-2">🎮 Game Lobby</h1>
              <p className="text-on-surface-variant text-base sm:text-lg">Share the code — start when everyone's in!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Left: Room Code + Controls */}
              <div className="space-y-6">
                {/* Room Code Card */}
                <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-8 text-center shadow-sm">
                  <p className="text-on-surface-variant text-sm font-label-bold uppercase tracking-widest mb-4">Room Code</p>
                  <div className="font-display font-black text-6xl sm:text-7xl tracking-[0.2em] text-primary mb-6 animate-pulse">
                    {roomCode}
                  </div>
                  <button
                    id="copy-room-code-btn"
                    onClick={handleCopyRoomCode}
                    className={`bg-surface border ${copySuccess ? 'border-primary text-primary' : 'border-border-subtle text-on-surface-variant'} py-3 px-8 rounded-lg font-label-bold flex items-center justify-center gap-2 mx-auto hover:bg-surface-container transition-all`}
                  >
                    {copySuccess ? '✓ Copied!' : '📋 Copy Code'}
                  </button>
                  <p className="text-on-surface-variant/70 text-xs mt-4">Players join at localhost:5173/play</p>
                </div>

                {/* Quiz Info */}
                <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="material-symbols-outlined text-primary text-3xl">menu_book</span>
                    <div>
                      <p className="text-on-surface font-label-bold">{topic}</p>
                      <p className="text-on-surface-variant text-sm">{questions.length} questions · 20 seconds each</p>
                    </div>
                  </div>
                </div>

                {/* Start Button */}
                {startError && (
                  <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
                    <p className="text-error text-sm text-center font-medium">{startError}</p>
                  </div>
                )}

                <button
                  id="start-game-btn"
                  onClick={handleStartGame}
                  disabled={players.length === 0}
                  className="w-full bg-primary-container text-white py-4 rounded-xl text-lg font-label-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#19a463] shadow-md transition-colors"
                >
                  🚀 Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
                </button>

                <button
                  onClick={handleReset}
                  className="w-full border border-border-subtle text-on-surface-variant py-3 rounded-xl font-label-bold hover:bg-surface-container transition-colors"
                >
                  ← Back to Dashboard
                </button>
              </div>

              {/* Right: Player List */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl shadow-sm overflow-hidden h-64 sm:h-80 lg:h-[600px] flex flex-col">
                <PlayerList players={players} />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ACTIVE / BETWEEN Phase
  if (phase === GAME_PHASES.ACTIVE || phase === GAME_PHASES.BETWEEN) {
    const progressPercent = totalQuestions > 0 ? ((questionIndex + 1) / totalQuestions) * 100 : 0;

    return (
      <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
        <HeaderNav />
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-4 space-y-4 flex-grow">
          
          {/* ── Admin Dashboard stats header ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Card 1: Quiz Title */}
            <div className="bg-surface-container-lowest border border-border-subtle shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl">
                <span className="material-symbols-outlined">menu_book</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider leading-none mb-1">Topic</p>
                <h4 className="text-sm font-semibold truncate leading-tight text-on-surface">{topic}</h4>
                <p className="text-[11px] text-on-surface-variant capitalize font-medium">{difficulty} mode</p>
              </div>
            </div>

            {/* Card 2: Room Code */}
            <div className="bg-surface-container-lowest border border-border-subtle shadow-sm rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl">
                <span className="material-symbols-outlined">key</span>
              </div>
              <div className="flex-1">
                <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider leading-none mb-1">Room Code</p>
                <div className="flex items-center gap-2">
                  <h4 className="text-md font-black tracking-widest leading-none font-display text-primary">{roomCode}</h4>
                  <button 
                    onClick={handleCopyRoomCode}
                    className="text-[10px] text-on-surface-variant hover:text-primary bg-surface border border-border-subtle px-1.5 py-0.5 rounded transition-all font-label-bold"
                  >
                    {copySuccess ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Connected Players */}
            <div 
              onClick={() => setShowPlayersList(!showPlayersList)}
              className={`bg-surface-container-lowest border border-border-subtle shadow-sm rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary transition-all relative select-none ${showPlayersList ? 'z-[60]' : 'z-10'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container text-xl flex-shrink-0">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider leading-none mb-1">Live Players</p>
                <div className="flex items-center gap-1.5 leading-none mb-1">
                  <h4 className="text-md font-bold text-on-surface leading-none">{players.length} Active</h4>
                  <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                </div>
                <p className="text-[10px] text-primary font-medium">Click to view list</p>
              </div>

              {/* Popup Box for Players List */}
              {showPlayersList && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full mt-2 left-0 right-0 z-[70] bg-surface-container-lowest border border-border-subtle shadow-2xl rounded-xl p-3"
                >
                  <div className="flex justify-between items-center border-b border-border-subtle pb-1.5 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Participants</span>
                    <button 
                      onClick={() => setShowPlayersList(false)}
                      className="text-on-surface-variant hover:text-error text-[10px] font-label-bold"
                    >
                      ✕ Close
                    </button>
                  </div>
                  
                  {players.length === 0 ? (
                    <p className="text-center py-4 text-on-surface-variant text-xs">No players yet.</p>
                  ) : (
                    <div className="overflow-y-auto max-h-[108px] space-y-1.5 pr-1 scrollbar-thin">
                      {players.map((p, idx) => (
                        <div key={p.userId || idx} className="flex items-center gap-2 px-2 py-1.5 bg-surface rounded-lg border border-border-subtle">
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <span className="text-xs text-on-surface font-medium truncate">{p.nickname}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 4: Quiz Progress */}
            <div className="bg-surface-container-lowest border border-border-subtle shadow-sm rounded-2xl p-4 flex flex-col justify-center">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1.5">
                <span>Quiz Progress</span>
                <span className="text-primary font-display font-bold">Q{questionIndex + 1}/{totalQuestions}</span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* ── Main Dashboard 3-Column Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Column 1: Live Leaderboard (Left) */}
            <div className="lg:col-span-1">
              <LiveLeaderboard leaderboard={leaderboard} currentUserId={user?.id} />
            </div>

            {/* Column 2: Active Question Area (Center) */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Controls & Status Bar */}
              <div className="bg-surface-container-lowest border border-border-subtle shadow-sm px-4 py-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                  <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                    Admin Console
                  </span>
                </div>
                <div className="text-xs text-on-surface-variant font-medium">
                  {timeUp ? (
                    <span className="text-primary font-bold flex items-center gap-1.5">
                      ⏳ Auto-advancing in a few seconds...
                    </span>
                  ) : (
                    <span className="text-primary-container font-bold flex items-center gap-1.5">
                      🟢 Live: Players are answering
                    </span>
                  )}
                </div>
                <button
                  onClick={handleEndGame}
                  className="bg-error/10 hover:bg-error/20 active:scale-95 text-error text-xs font-bold py-1.5 px-4 rounded-xl border border-error/20 transition-all cursor-pointer"
                >
                  End Game
                </button>
              </div>

              {/* Question Card (always show correct answer for Admin) */}
              {currentQuestion && (
                <div className="relative">
                  <QuestionCard
                    question={currentQuestion}
                    questionIndex={questionIndex}
                    totalQuestions={totalQuestions}
                    timeLimit={20}
                    onAnswer={() => {}} // Host doesn't submit answers
                    answered={false}
                    selectedOption={null}
                    correctOptionIndex={questions[questionIndex]?.correctOptionIndex}
                    alwaysShowCorrect={true}
                    timeUp={timeUp}
                  />
                  {/* Host Overlay block */}
                  <div className="absolute inset-0 rounded-xl cursor-not-allowed z-10" />
                </div>
              )}
            </div>

            {/* Column 3: Stats history panel (Right) */}
            <div className="lg:col-span-1">
              <div className="bg-surface-container-lowest border border-border-subtle shadow-sm p-5 h-full rounded-2xl flex flex-col min-h-[400px]">
                <h3 className="font-display font-bold text-on-surface text-sm uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-border-subtle pb-3">
                  <span className="material-symbols-outlined text-lg">bar_chart</span>
                  Question Stats
                </h3>
                
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[500px] lg:max-h-[600px] scrollbar-thin">
                  {quizStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-on-surface-variant/50">
                      <span className="material-symbols-outlined text-4xl mb-2">monitoring</span>
                      <p className="text-xs font-medium">Stats for each completed question will appear here.</p>
                    </div>
                  ) : (
                    [...quizStats].reverse().map((stat, reversedIdx) => {
                      // Correctly compute original index since we reversed the array to show latest first
                      const originalIdx = quizStats.length - 1 - reversedIdx;
                      const letters = ['A', 'B', 'C', 'D'];
                      const colors = [
                        'bg-error', 
                        'bg-[#4285F4]', // Blue
                        'bg-[#F4B400]', // Amber
                        'bg-primary-container' // Emerald
                      ];
                      
                      return (
                        <div key={originalIdx} className="bg-surface rounded-xl p-3 border border-border-subtle space-y-3">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary font-display">
                              Q{originalIdx + 1}
                            </span>
                            <span className="text-[9px] text-on-surface-variant font-medium font-display">
                              {stat.totalAnswers} Player{stat.totalAnswers !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <p className="text-xs text-on-surface font-semibold leading-normal line-clamp-2">
                            {stat.questionText}
                          </p>
                          
                          <div className="space-y-2 pt-1">
                            {stat.counts.map((cnt, oIdx) => {
                              const percentage = stat.totalAnswers > 0 
                                ? Math.round((cnt / stat.totalAnswers) * 100) 
                                : 0;
                              
                              const isCorrect = oIdx === questions[originalIdx]?.correctOptionIndex;
                              
                              return (
                                <div key={oIdx} className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className={`font-semibold ${isCorrect ? 'text-primary' : 'text-on-surface-variant'}`}>
                                      Option {letters[oIdx]} {isCorrect && '✓'}
                                    </span>
                                    <span className="text-on-surface-variant font-display font-medium">{percentage}% ({cnt})</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${colors[oIdx]} rounded-full`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    );
  }

  return null;
};

export default Host;
