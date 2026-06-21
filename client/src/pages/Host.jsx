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
    // We need to fetch the full quiz since the history endpoint excludes questions
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

  // SETUP Phase
  if (phase === GAME_PHASES.SETUP || phase === GAME_PHASES.GENERATING) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl animate-slide-up">
          
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <h1 className="font-display font-black text-3xl text-white">
              Your Quizzes
            </h1>
            <button
              onClick={() => navigate('/builder')}
              className="bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
            >
              <span>+</span> Build New Quiz
            </button>
          </div>

          <div className="flex items-center gap-2 mb-6 p-1 bg-white/5 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'saved' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
            >
              Saved Templates
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
            >
              Past Games
            </button>
          </div>

          <div className="glass-card p-6 min-h-[300px]">
            {fetchingSaved ? (
              <div className="flex flex-col items-center justify-center h-48">
                <div className="w-8 h-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin mb-4" />
                <p className="text-white/50 text-sm">Loading your quizzes...</p>
              </div>
            ) : activeTab === 'saved' ? (
              savedQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <div className="text-5xl mb-4 opacity-50">📂</div>
                  <h3 className="text-white font-semibold text-lg mb-2">No saved templates</h3>
                  <p className="text-white/40 text-sm max-w-xs mx-auto">
                    You haven't saved any quizzes yet. Click "Build New Quiz" to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedQuizzes.map((quiz) => (
                    <div key={quiz._id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-white/10 transition gap-4">
                      <div className="min-w-0 flex-1 w-full pr-4">
                        <h3 className="text-white font-semibold text-lg truncate" title={quiz.topic}>{quiz.topic}</h3>
                        <p className="text-white/40 text-xs mt-1">{quiz.questionCount} Questions · Saved on {new Date(quiz.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                        <button
                          onClick={() => handleHostSaved(quiz._id)}
                          className="flex-1 sm:flex-none bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-sm font-semibold px-4 py-2 rounded-lg transition"
                          title="Host Now"
                        >
                          🚀 Host
                        </button>
                        <button
                          onClick={() => handleEditSaved(quiz)}
                          className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                          title="Edit in Builder"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSaved(quiz._id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-medium px-3 py-2 rounded-lg transition"
                          title="Delete Quiz"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Past Games Tab
              pastQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <div className="text-5xl mb-4 opacity-50">🏆</div>
                  <h3 className="text-white font-semibold text-lg mb-2">No past games yet</h3>
                  <p className="text-white/40 text-sm max-w-xs mx-auto">
                    Host a quiz to completion to see your game history here!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastQuizzes.map((quiz) => (
                    <div key={quiz._id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-white/10 transition gap-4">
                      <div className="min-w-0 flex-1 w-full pr-4">
                        <h3 className="text-white font-semibold text-lg truncate" title={quiz.topic}>{quiz.topic}</h3>
                        <p className="text-white/40 text-xs mt-1">Played on {new Date(quiz.createdAt).toLocaleDateString()} · {quiz.finalLeaderboard?.length || 0} Players</p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                        <button
                          onClick={() => navigate('/leaderboard', { state: { finalLeaderboard: quiz.finalLeaderboard, isHost: true } })}
                          className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                          title="View Leaderboard"
                        >
                          🏅 Results
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Connection status */}
          <div className={`mt-6 flex items-center justify-center gap-2 text-xs ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
            {isConnected ? 'Connected to server' : 'Connecting...'}
          </div>
        </div>
      </div>
    );
  }

  // LOBBY Phase
  if (phase === GAME_PHASES.LOBBY) {
    return (
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-slide-down">
            <h1 className="font-display font-black text-4xl text-white mb-2">🎮 Game Lobby</h1>
            <p className="text-white/50">Share the code — start when everyone's in!</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Room Code + Controls */}
            <div className="space-y-5">
              {/* Room Code Card */}
              <div className="glass-card p-6 text-center">
                <p className="text-white/50 text-sm font-medium uppercase tracking-widest mb-3">Room Code</p>
                <div className="font-display font-black text-6xl sm:text-7xl tracking-[0.2em] text-white mb-4 animate-pulse-glow">
                  {roomCode}
                </div>
                <button
                  id="copy-room-code-btn"
                  onClick={handleCopyRoomCode}
                  className={`btn-secondary text-sm py-2.5 px-6 flex items-center gap-2 mx-auto ${copySuccess ? 'border-emerald-500/50 text-emerald-400' : ''}`}
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy Code'}
                </button>
                <p className="text-white/30 text-xs mt-3">Players join at quizai.app/play</p>
              </div>

              {/* Quiz Info */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <p className="text-white font-semibold">Topic: {topic}</p>
                    <p className="text-white/50 text-sm">{questions.length} questions · 20 seconds each</p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              {startError && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-400 text-sm text-center">{startError}</p>
                </div>
              )}

              <button
                id="start-game-btn"
                onClick={handleStartGame}
                disabled={players.length === 0}
                className="btn-success w-full py-4 text-base font-display font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🚀 Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
              </button>

              <button
                onClick={handleReset}
                className="btn-secondary w-full py-3 text-sm"
              >
                ← Create New Quiz
              </button>
            </div>

            {/* Right: Player List */}
            <PlayerList players={players} />
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE / BETWEEN Phase
  if (phase === GAME_PHASES.ACTIVE || phase === GAME_PHASES.BETWEEN) {
    const progressPercent = totalQuestions > 0 ? ((questionIndex + 1) / totalQuestions) * 100 : 0;

    return (
      <div className="min-h-screen pt-20 px-4 pb-12 bg-[#090714] text-white">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* ── Admin Dashboard stats header ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card 1: Quiz Title */}
            <div className="glass-card p-4 flex items-center gap-3 bg-white/[0.02] border-white/10 shadow-lg shadow-black/10">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-xl">
                📝
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">Topic</p>
                <h4 className="text-sm font-semibold truncate leading-tight">{topic}</h4>
                <p className="text-[11px] text-white/50 capitalize font-medium">{difficulty} mode</p>
              </div>
            </div>

            {/* Card 2: Room Code */}
            <div className="glass-card p-4 flex items-center gap-3 bg-white/[0.02] border-white/10 shadow-lg shadow-black/10">
              <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xl">
                🔑
              </div>
              <div className="flex-1">
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">Room Code</p>
                <div className="flex items-center gap-2">
                  <h4 className="text-md font-black tracking-widest leading-none font-mono text-brand-300">{roomCode}</h4>
                  <button 
                    onClick={handleCopyRoomCode}
                    className="text-[10px] text-white/30 hover:text-white/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded transition-all font-sans font-normal"
                  >
                    {copySuccess ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Connected Players */}
            <div 
              onClick={() => setShowPlayersList(!showPlayersList)}
              className={`glass-card p-4 flex items-center gap-3 bg-white/[0.02] border-white/10 shadow-lg shadow-black/10 cursor-pointer hover:bg-white/[0.06] transition-all relative select-none ${showPlayersList ? 'z-[60]' : 'z-10'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-xl flex-shrink-0">
                👥
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">Live Players</p>
                <div className="flex items-center gap-1.5 leading-none mb-1">
                  <h4 className="text-md font-bold text-white leading-none">{players.length} Active</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-brand-300 font-medium">Click to view list</p>
              </div>

              {/* Popup Box for Players List */}
              {showPlayersList && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full mt-2 left-0 right-0 z-[70] glass-card p-3 bg-[#16122f] border border-white/20 shadow-2xl rounded-xl"
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Participants</span>
                    <button 
                      onClick={() => setShowPlayersList(false)}
                      className="text-white/40 hover:text-white text-[10px] font-sans font-bold"
                    >
                      ✕ Close
                    </button>
                  </div>
                  
                  {players.length === 0 ? (
                    <p className="text-center py-4 text-white/30 text-xs">No players yet.</p>
                  ) : (
                    <div className="overflow-y-auto max-h-[108px] space-y-1.5 pr-1 scrollbar-thin">
                      {players.map((p, idx) => (
                        <div key={p.userId || idx} className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/[0.03]">
                          <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <span className="text-xs text-white/80 font-medium truncate">{p.nickname}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 4: Quiz Progress */}
            <div className="glass-card p-4 flex flex-col justify-center bg-white/[0.02] border-white/10 shadow-lg shadow-black/10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1.5">
                <span>Quiz Progress</span>
                <span className="text-brand-300 font-mono">Q{questionIndex + 1}/{totalQuestions}</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          {/* ── Main Dashboard 3-Column Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Column 1: Live Leaderboard (Left) */}
            <div className="lg:col-span-1">
              <LiveLeaderboard leaderboard={leaderboard} currentUserId={user?.id} />
            </div>

            {/* Column 2: Active Question Area (Center) */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Controls & Status Bar */}
              <div className="glass-card px-5 py-3.5 flex items-center justify-between bg-white/[0.03] border-white/10 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping" />
                  <span className="text-xs font-semibold tracking-wide text-brand-300 uppercase">
                    Admin Console
                  </span>
                </div>
                <div className="text-xs text-white/50 font-medium">
                  {timeUp ? (
                    <span className="text-amber-400 animate-pulse flex items-center gap-1.5">
                      ⏳ Auto-advancing in a few seconds...
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      🟢 Live: Players are answering
                    </span>
                  )}
                </div>
                <button
                  onClick={handleEndGame}
                  className="bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 text-xs font-bold py-1.5 px-4 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer"
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
              <div className="glass-card p-5 h-full flex flex-col bg-white/[0.03] border-white/10 shadow-lg min-h-[400px]">
                <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                  📊 Question Stats
                </h3>
                
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[500px] lg:max-h-[600px] scrollbar-thin">
                  {quizStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-white/20">
                      <span className="text-3xl mb-2">📈</span>
                      <p className="text-xs">Stats for each completed question will appear here.</p>
                    </div>
                  ) : (
                    [...quizStats].reverse().map((stat, reversedIdx) => {
                      // Correctly compute original index since we reversed the array to show latest first
                      const originalIdx = quizStats.length - 1 - reversedIdx;
                      const letters = ['A', 'B', 'C', 'D'];
                      const colors = [
                        'bg-gradient-to-r from-red-600 to-red-500', 
                        'bg-gradient-to-r from-blue-600 to-blue-500', 
                        'bg-gradient-to-r from-amber-600 to-amber-500', 
                        'bg-gradient-to-r from-emerald-600 to-emerald-500'
                      ];
                      
                      return (
                        <div key={originalIdx} className="bg-white/[0.02] rounded-xl p-3 border border-white/5 space-y-3">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">
                              Q{originalIdx + 1}
                            </span>
                            <span className="text-[9px] text-white/30 font-medium font-mono">
                              {stat.totalAnswers} Player{stat.totalAnswers !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <p className="text-xs text-white/80 font-medium leading-normal line-clamp-2">
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
                                    <span className={`font-semibold ${isCorrect ? 'text-emerald-400' : 'text-white/50'}`}>
                                      Option {letters[oIdx]} {isCorrect && '✓'}
                                    </span>
                                    <span className="text-white/70 font-mono">{percentage}% ({cnt})</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
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
        </div>
      </div>
    );
  }

  return null;
};

export default Host;
